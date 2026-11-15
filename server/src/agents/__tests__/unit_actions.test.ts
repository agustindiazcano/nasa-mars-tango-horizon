import { describe, expect, it, vi } from "vitest";
import type { MissionContext } from "../types.js";

vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => false,
  chat: vi.fn(),
}));

import { review, ruleCheck } from "../guardian.js";
import { offlineReply } from "../offline.js";
import { UNIT_ACTION_IDS, capabilitiesFor, capabilityPrompt } from "../unitCapabilities.js";

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    lang: "es",
    met_s: 600,
    astronaut: { x: -160, z: -280, body_kg: 78, load_kg: 65, speed: 0 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2, o2_reserve_kg: 0.5 },
    leak_diameter_m: 0,
    env: {
      pressure_pa: 750,
      air_temp_k: 220,
      tau: 0.5,
      wind_ms: 6,
      dose_rate_ugy_h: 10,
    },
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: -120, z: -300, battery: 0.8, busy: false },
      { id: "rescue-1", kind: "rescue", x: -190, z: -300, battery: 0.9, busy: false },
      { id: "manip-1", kind: "manipulator", x: -150, z: -270, battery: 0.9, busy: false },
      { id: "drone-1", kind: "drone", x: -170, z: -290, battery: 0.85, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

describe("Robot action catalog (unitCapabilities + GUARDIAN)", () => {
  it("exposes 10 unit actions and filters capabilities by unit kind", () => {
    expect(UNIT_ACTION_IDS).toHaveLength(10);
    expect(capabilitiesFor("drone")).toContain("takeoff");
    expect(capabilitiesFor("drone")).toContain("photograph_area");
    expect(capabilitiesFor("rover_crew")).not.toContain("takeoff");
    expect(capabilitiesFor("rover_crew")).toContain("follow_astronaut");
    expect(capabilityPrompt("drone-1", "drone")).toMatch(/takeoff/);
  });

  it("denies takeoff for ground rovers and during dust storms (tau >= 1.8)", () => {
    const ctx = makeContext();
    const roverTakeoff = ruleCheck(
      { type: "unit_action", args: { unit_id: "rover-1", action: "takeoff" }, proposedBy: "BASE" },
      ctx,
    );
    expect(roverTakeoff?.decision).toBe("deny");
    expect(roverTakeoff?.reason).toMatch(/cannot perform takeoff/i);

    const stormCtx = makeContext({ env: { ...ctx.env, tau: 2.2, wind_ms: 18 } });
    const droneStorm = ruleCheck(
      { type: "unit_action", args: { unit_id: "drone-1", action: "takeoff" }, proposedBy: "BASE" },
      stormCtx,
    );
    expect(droneStorm?.decision).toBe("deny");
    expect(droneStorm?.reason).toMatch(/aircraft grounding limit/i);
  });

  it("allows clean low-risk unit_action within hard limits deterministically without LLM judge", async () => {
    const ctx = makeContext();
    const verdict = await review(
      { type: "unit_action", args: { unit_id: "drone-1", action: "photograph_area", heading: "east" }, proposedBy: "BASE" },
      ctx,
      "Drone uno, fotografiá la zona al este",
      [],
    );
    expect(verdict.decision).toBe("allow");
    expect(verdict.by).toBe("rules");
  });

  it("does not bypass the judge when untrusted context is present", async () => {
    const ctx = makeContext();
    const verdict = await review(
      { type: "unit_action", args: { unit_id: "rover-1", action: "follow_astronaut" }, proposedBy: "BASE" },
      ctx,
      "Rover uno, seguime",
      ["untrusted document excerpt"],
    );
    // Without an LLM key in unit tests, judge() returns ask_human rather than auto-allowing via rules.
    expect(verdict.decision).not.toBe("allow");
  });

  it("executes the deterministic suit-leak protocol (pod, beacons, rescue, alert)", async () => {
    const ctx = makeContext({ leak_diameter_m: 0.004 });
    const res = await offlineReply("Tengo una fuga en el traje, necesito soporte vital", ctx);
    const types = res.actions.map((a) => a.type);
    expect(types).toContain("show_alert");
    expect(types).toContain("launch_pod");
    expect(types).toContain("deploy_beacons");
    expect(types).toContain("dispatch");
  });
});
