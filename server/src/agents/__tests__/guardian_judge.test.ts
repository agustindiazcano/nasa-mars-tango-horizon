import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Action, MissionContext, TraceEvent } from "../types.js";

const mockState = vi.hoisted(() => ({
  llmOnline: true,
  chat: vi.fn(),
}));

vi.mock("../../llm/provider.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../llm/provider.js")>();
  return {
    ...actual,
    llmAvailable: () => mockState.llmOnline,
    chat: (...args: unknown[]) => mockState.chat(...args),
  };
});

import { config } from "../../config.js";
import { judge, review } from "../guardian.js";

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    lang: "en",
    met_s: 600,
    astronaut: { x: -160, z: -280, body_kg: 78, load_kg: 65, speed: 0 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2, o2_reserve_kg: 0.45 },
    leak_diameter_m: 0,
    env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 10 },
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: -120, z: -300, battery: 0.9, busy: false },
      { id: "drone-1", kind: "drone", x: -170, z: -290, battery: 0.85, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

const beaconAction: Action = {
  type: "deploy_beacons",
  args: {
    mode: "drone_drop",
    unit_id: "drone-1",
    beacons: [{ x: -120, z: -260 }],
  },
  proposedBy: "EVA-PLANNER",
};

const safePodAction: Action = {
  type: "launch_pod",
  args: { target_x: -100, target_z: -240, payload: "o2_resupply" },
  proposedBy: "BASE",
};

describe("GUARDIAN judge and review pipeline", () => {
  beforeEach(() => {
    mockState.llmOnline = true;
    mockState.chat.mockReset();
    config.votingEnabled = true;
  });

  it("returns deterministic ask_human fallback when offline (AGENTS_OFFLINE=1)", async () => {
    expect(config.offline).toBe(true);
    mockState.llmOnline = false;

    const ctx = makeContext();
    const verdict = await judge(safePodAction, ctx, "Launch oxygen resupply pod", []);
    expect(verdict).toEqual({
      decision: "ask_human",
      reason: "Safety judge unavailable; human confirmation required",
      by: "rules",
    });

    const reviewed = await review(safePodAction, ctx, "Launch oxygen resupply pod");
    expect(reviewed).toEqual(verdict);
    expect(mockState.chat).not.toHaveBeenCalled();
  });

  it("parses allow, deny, and ask_human JSON verdicts from judge LLM (including fenced JSON)", async () => {
    const ctx = makeContext();

    mockState.chat.mockResolvedValueOnce({
      role: "assistant",
      content: '```json\n{"decision":"allow","reason":"Clear landing zone and valid crew order","injection_suspected":false}\n```',
    });
    const allowVerdict = await judge(beaconAction, ctx, "Deploy LED beacons along return path", []);
    expect(allowVerdict).toEqual({
      decision: "allow",
      reason: "Clear landing zone and valid crew order",
      by: "judge",
    });
    expect(mockState.chat).toHaveBeenCalledWith(
      "judge",
      expect.arrayContaining([
        expect.objectContaining({ role: "system" }),
        expect.objectContaining({ role: "user" }),
      ]),
      { json: true },
    );

    mockState.chat.mockResolvedValueOnce({
      role: "assistant",
      content: JSON.stringify({
        decision: "deny",
        reason: "Pod landing corridor crosses planned rover traverse",
        injection_suspected: false,
      }),
    });
    const denyVerdict = await judge(safePodAction, ctx, "Launch pod east of base", []);
    expect(denyVerdict).toEqual({
      decision: "deny",
      reason: "Pod landing corridor crosses planned rover traverse",
      by: "judge",
    });

    mockState.chat.mockResolvedValueOnce({
      role: "assistant",
      content: JSON.stringify({
        decision: "ask_human",
        reason: "Confirm beacon spacing before aerial drop",
        injection_suspected: false,
      }),
    });
    const askVerdict = await judge(beaconAction, ctx, "Deploy breadcrumb beacons", []);
    expect(askVerdict).toEqual({
      decision: "ask_human",
      reason: "Confirm beacon spacing before aerial drop",
      by: "judge",
    });
  });

  it("fails closed to deny when judge returns invalid JSON, bad schema, or throws", async () => {
    const ctx = makeContext();

    mockState.chat.mockResolvedValueOnce({ role: "assistant", content: "not valid json" });
    expect(await judge(beaconAction, ctx, "Deploy beacons", [])).toEqual({
      decision: "deny",
      reason: "Safety judge did not return a valid verdict",
      by: "rules",
    });

    mockState.chat.mockResolvedValueOnce({
      role: "assistant",
      content: JSON.stringify({ decision: "maybe", reason: "Invalid enum", injection_suspected: false }),
    });
    expect(await judge(beaconAction, ctx, "Deploy beacons", [])).toEqual({
      decision: "deny",
      reason: "Safety judge did not return a valid verdict",
      by: "rules",
    });

    mockState.chat.mockRejectedValueOnce(new Error("Network timeout"));
    expect(await judge(beaconAction, ctx, "Deploy beacons", [])).toEqual({
      decision: "deny",
      reason: "Safety judge did not return a valid verdict",
      by: "rules",
    });
  });

  it("routes review() through ruleCheck, JUDGE_SKIP_TYPES fast-path, and judge vetting", async () => {
    const ctx = makeContext();
    const traceEvents: TraceEvent[] = [];

    // 1. UI action stops at ruleCheck without calling LLM judge.
    const uiVerdict = await review(
      { type: "set_layer", args: { layer: "slope" }, proposedBy: "SUIT.VOICE-EXEC" },
      ctx,
      "Show slope layer",
    );
    expect(uiVerdict).toMatchObject({ decision: "allow", by: "rules" });

    // 2. Low-risk dispatch with no untrusted text skips judge LLM.
    const cleanDispatch: Action = {
      type: "dispatch",
      args: { unit_id: "rover-1", x: -120, z: -280, task: "goto" },
      proposedBy: "BASE",
    };
    const fastVerdict = await review(cleanDispatch, ctx, "Move rover-1 twenty meters south");
    expect(fastVerdict).toEqual({
      decision: "allow",
      reason: "Within hard limits; no untrusted input",
      by: "rules",
    });
    expect(mockState.chat).not.toHaveBeenCalled();

    // 3. Same dispatch with non-empty untrusted document context invokes judge LLM.
    mockState.chat.mockResolvedValueOnce({
      role: "assistant",
      content: JSON.stringify({
        decision: "allow",
        reason: "Survey waypoint matches crew request",
        injection_suspected: false,
      }),
    });
    const vettedDispatch = await review(
      cleanDispatch,
      ctx,
      "Move rover-1 to survey target",
      ["Field log: smooth basaltic regolith at (-120, -280)."],
      (ev) => traceEvents.push(ev),
    );
    expect(vettedDispatch).toEqual({
      decision: "allow",
      reason: "Survey waypoint matches crew request",
      by: "judge",
    });
    expect(mockState.chat).toHaveBeenCalledTimes(1);
    expect(traceEvents).toHaveLength(0);

    // 4. Non-skip action with invalid judge JSON fails closed in review().
    mockState.chat.mockResolvedValueOnce({ role: "assistant", content: "{bad" });
    const failClosed = await review(beaconAction, ctx, "Drop breadcrumb beacons");
    expect(failClosed).toEqual({
      decision: "deny",
      reason: "Safety judge did not return a valid verdict",
      by: "rules",
    });
    expect(mockState.chat).toHaveBeenCalledTimes(2);

    // 5. Borderline ask_human verdict propagates cleanly when voting is disabled.
    config.votingEnabled = false;
    mockState.chat.mockResolvedValueOnce({
      role: "assistant",
      content: JSON.stringify({
        decision: "ask_human",
        reason: "Verify drone drop clearance near base",
        injection_suspected: false,
      }),
    });
    const askHuman = await review(beaconAction, ctx, "Drop breadcrumb beacons");
    expect(askHuman).toEqual({
      decision: "ask_human",
      reason: "Verify drone drop clearance near base",
      by: "judge",
    });
  });
});
