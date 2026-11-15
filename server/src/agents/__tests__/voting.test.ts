import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Action, MissionContext, TraceEvent, Verdict, VoterResult } from "../types.js";

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

import { reasoningPayloadFor } from "../../llm/provider.js";
import { review } from "../guardian.js";
import {
  VOTER_PANEL,
  getEscalationTriggers,
  runEscalatedVoting,
  shouldEscalateVoting,
  tallyAndResolveVotes,
} from "../voting.js";

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
      { id: "rescue-1", kind: "rescue", x: -190, z: -300, battery: 0.9, busy: false },
      { id: "drone-1", kind: "drone", x: -170, z: -290, battery: 0.85, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

function makeVoteMsg(vote: "allow" | "deny" | "ask_human", confidence: number, rationale: string) {
  return {
    role: "assistant" as const,
    content: JSON.stringify({ vote, confidence, rationale }),
  };
}

function makeVoterResult(
  voter: string,
  vote: "allow" | "deny" | "ask_human" | null,
  confidence: number | null,
  status: "ok" | "timeout" | "error" = "ok",
): VoterResult {
  return {
    voter,
    model: voter === "Voter C" ? "muse-wonder-1.0" : voter === "Voter B" ? "google/gemini-4-argon" : "google/gemini-4-carbon",
    provider: voter === "Voter C" ? "meta" : "vertex",
    vote,
    confidence,
    rationale: vote ? `Rationale for ${vote}` : "",
    latency_ms: 120,
    status,
    ...(status !== "ok" ? { error: status } : {}),
  };
}

describe("Post-guardrail escalated multi-model voting (B16)", () => {
  beforeEach(() => {
    mockState.llmOnline = true;
    mockState.chat.mockReset();
  });

  it("adapts reasoning_effort cleanly across Vertex, Gemini, and Meta providers", () => {
    expect(reasoningPayloadFor("vertex", undefined)).toEqual({ reasoning_effort: "low" });
    expect(reasoningPayloadFor("gemini", undefined)).toEqual({ reasoning_effort: "low" });
    expect(reasoningPayloadFor("meta", undefined)).toEqual({});
    expect(reasoningPayloadFor("vertex", "low")).toEqual({ reasoning_effort: "low" });
    expect(reasoningPayloadFor("meta", "medium")).toEqual({ reasoning_effort: "medium" });
  });

  it("bypasses voting with 0 calls when ruleCheck denies (pod keep-out, slope, battery)", async () => {
    const ctx = makeContext();
    const traceEvents: TraceEvent[] = [];

    // Launch pod inside 15 m crew keep-out radius -> deterministic ruleCheck deny
    const closePod: Action = {
      type: "launch_pod",
      args: { target_x: -155, target_z: -280, payload: "full_life_support" },
      proposedBy: "BASE",
    };
    const podVerdict = await review(closePod, ctx, "Launch O2 pod", [], (ev) => traceEvents.push(ev));
    expect(podVerdict.decision).toBe("deny");
    expect(podVerdict.by).toBe("rules");

    // Dispatch rover-1 onto >20 deg slope (500, 500 is 25.67 deg) -> deterministic ruleCheck deny
    const steepDispatch: Action = {
      type: "dispatch",
      args: { unit_id: "rover-1", x: 500, z: 500, task: "rescue" },
      proposedBy: "BASE",
    };
    const slopeVerdict = await review(steepDispatch, ctx, "Send rover-1", [], (ev) => traceEvents.push(ev));
    expect(slopeVerdict.decision).toBe("deny");
    expect(slopeVerdict.by).toBe("rules");

    // Low battery dispatch -> deterministic ruleCheck deny
    const lowBatCtx = makeContext({
      fleet: [{ id: "rover-1", kind: "rover_crew", x: -120, z: -300, battery: 0.05, busy: false }],
    });
    const lowBatVerdict = await review(
      { type: "dispatch", args: { unit_id: "rover-1", x: -120, z: -280, task: "rescue" }, proposedBy: "BASE" },
      lowBatCtx,
      "Send rover-1",
      [],
      (ev) => traceEvents.push(ev),
    );
    expect(lowBatVerdict.decision).toBe("deny");
    expect(lowBatVerdict.by).toBe("rules");

    expect(mockState.chat).not.toHaveBeenCalled();
    expect(traceEvents).toHaveLength(0);
  });

  it("bypasses voting with 0 calls when Step 2 flags guard.injection_blocked or denies", async () => {
    const ctx = makeContext({ leak_diameter_m: 0.0016 });
    const pod: Action = {
      type: "launch_pod",
      args: { target_x: -120, target_z: -280, payload: "full_life_support" },
      proposedBy: "BASE",
    };
    const blockedVerdict: Verdict = {
      decision: "deny",
      reason: "Blocked by Step 2 safety check",
      reasonKey: "guard.injection_blocked",
      by: "judge",
    };

    expect(shouldEscalateVoting(pod, ctx, blockedVerdict)).toBe(false);
    const out = await runEscalatedVoting(pod, ctx, "Launch pod", [], blockedVerdict);
    expect(out).toBeNull();
    expect(mockState.chat).not.toHaveBeenCalled();
  });

  it("bypasses voting for routine HUD and low-risk physical actions", async () => {
    const ctx = makeContext({ leak_diameter_m: 0.0016 }); // Even during severe telemetry, HUD actions bypass voting
    const hudAction: Action = { type: "set_layer", args: { layer: "slope" }, proposedBy: "SUIT.VOICE-EXEC" };
    const allowRules: Verdict = { decision: "allow", reason: "UI action", by: "rules" };
    expect(shouldEscalateVoting(hudAction, ctx, allowRules)).toBe(false);
    expect(await review(hudAction, ctx, "Switch to slope layer")).toMatchObject({ decision: "allow", by: "rules" });

    // Routine short-range flat dispatch under nominal telemetry
    const nominalCtx = makeContext();
    const routineDispatch: Action = {
      type: "dispatch",
      args: { unit_id: "rover-1", x: -120, z: -280, task: "goto" },
      proposedBy: "BASE",
    };
    expect(shouldEscalateVoting(routineDispatch, nominalCtx, allowRules)).toBe(false);
    expect(await review(routineDispatch, nominalCtx, "Move rover-1 20m south")).toMatchObject({
      decision: "allow",
      by: "rules",
    });
    expect(mockState.chat).not.toHaveBeenCalled();
  });

  it("detects all 3 escalation triggers in §3.1", () => {
    const ctx = makeContext();
    const allowJudge: Verdict = { decision: "allow", reason: "ok", by: "judge" };
    const askJudge: Verdict = { decision: "ask_human", reason: "borderline", by: "judge" };
    const routineDispatch: Action = {
      type: "dispatch",
      args: { unit_id: "rover-1", x: -120, z: -280, task: "goto" },
      proposedBy: "BASE",
    };

    // Trigger 1: Borderline judge verdict
    expect(getEscalationTriggers(routineDispatch, ctx, askJudge)).toEqual(["borderline_judge"]);

    // Trigger 2: High-consequence physical actuation
    expect(
      getEscalationTriggers(
        { type: "launch_pod", args: { target_x: -120, target_z: -280 }, proposedBy: "BASE" },
        ctx,
        allowJudge,
      ),
    ).toContain("high_consequence_actuation");
    expect(
      getEscalationTriggers(
        { type: "deploy_beacons", args: { mode: "ballistic_canister" }, proposedBy: "BASE" },
        ctx,
        allowJudge,
      ),
    ).toContain("high_consequence_actuation");
    expect(
      getEscalationTriggers(
        { type: "dispatch", args: { unit_id: "rescue-1", x: -170, z: -280, task: "rescue" }, proposedBy: "BASE" },
        ctx,
        allowJudge,
      ),
    ).toContain("high_consequence_actuation");
    expect(
      getEscalationTriggers(
        { type: "dispatch", args: { unit_id: "rover-1", x: 150, z: -300, task: "goto" }, proposedBy: "BASE" },
        ctx,
        allowJudge,
      ),
    ).toContain("high_consequence_actuation");
    // Slope > 15 deg (1000, 1000 has slope 17.65 deg) with short distance <= 200 m
    const slopeCtx = makeContext({
      fleet: [{ id: "rover-1", kind: "rover_crew", x: 960, z: 960, battery: 0.9, busy: false }],
    });
    expect(
      getEscalationTriggers(
        { type: "dispatch", args: { unit_id: "rover-1", x: 1000, z: 1000, task: "goto" }, proposedBy: "BASE" },
        slopeCtx,
        allowJudge,
      ),
    ).toContain("high_consequence_actuation");

    // Trigger 3: Severe telemetry (leak, tau >= 1.5, dose > 100, O2 margin < 45 min)
    expect(getEscalationTriggers(routineDispatch, makeContext({ leak_diameter_m: 0.001 }), allowJudge)).toContain(
      "severe_telemetry",
    );
    expect(
      getEscalationTriggers(routineDispatch, makeContext({ env: { ...ctx.env, tau: 1.5 } }), allowJudge),
    ).toContain("severe_telemetry");
    expect(
      getEscalationTriggers(routineDispatch, makeContext({ env: { ...ctx.env, dose_rate_ugy_h: 120 } }), allowJudge),
    ).toContain("severe_telemetry");
    expect(
      getEscalationTriggers(
        routineDispatch,
        makeContext({ suit: { suit_pressure_pa: 29600, o2_primary_kg: 0.02 } }),
        allowJudge,
      ),
    ).toContain("severe_telemetry");
  });

  it("runs all 3 configured voters concurrently via Promise.allSettled in < 2800 ms and emits voting trace", async () => {
    const ctx = makeContext({ leak_diameter_m: 0.0016 });
    const pod: Action = {
      type: "launch_pod",
      args: { target_x: -120, target_z: -280, payload: "full_life_support" },
      proposedBy: "BASE",
    };

    mockState.chat.mockImplementation(async (tier: string, _msgs: unknown, opts?: { providers?: string[]; onMeta?: (m: { provider: "vertex" | "gemini" | "meta"; model: string; ms: number }) => void }) => {
      // First call is Step 2 judge; remaining 3 calls are concurrent voters.
      if (tier === "judge") {
        return { role: "assistant", content: JSON.stringify({ decision: "allow", reason: "Emergency pod valid", injection_suspected: false }) };
      }
      await new Promise((r) => setTimeout(r, 40));
      const isMeta = opts?.providers?.[0] === "meta";
      opts?.onMeta?.({
        provider: isMeta ? "meta" : "vertex",
        model: isMeta ? "muse-wonder-1.0" : tier === "large" ? "google/gemini-4-carbon" : "google/gemini-4-argon",
        ms: 40,
      });
      return makeVoteMsg("allow", 0.92, "Crew leak emergency justifies ballistic O2 pod.");
    });

    const traceEvents: TraceEvent[] = [];
    const t0 = Date.now();
    const verdict = await review(pod, ctx, "Launch O2 pod", [], (ev) => traceEvents.push(ev));
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeLessThan(2800);
    expect(verdict.decision).toBe("allow");
    expect(verdict.by).toBe("voting");
    expect(mockState.chat).toHaveBeenCalledTimes(4); // 1 judge + 3 concurrent voters

    const voterCalls = mockState.chat.mock.calls.slice(1);
    expect(voterCalls.map((c) => c[2])).toEqual([
      expect.objectContaining({
        providers: ["vertex", "gemini"],
        reasoning_effort: "low",
        maxTokens: 650,
        timeoutMs: 2500,
      }),
      expect.objectContaining({
        providers: ["vertex", "gemini"],
        maxTokens: 600,
        timeoutMs: 2000,
      }),
      expect.objectContaining({
        providers: ["meta"],
        reasoning_effort: "medium",
        maxTokens: 650,
        timeoutMs: 2500,
      }),
    ]);

    expect(traceEvents).toHaveLength(1);
    expect(traceEvents[0].kind).toBe("voting");
    expect(traceEvents[0].agent).toBe("ESC-VOTE");
  });

  it("enforces per-voter AbortController timeout and still completes < 2800 ms with degraded 2-voter quorum", async () => {
    const ctx = makeContext({ leak_diameter_m: 0.0016 });
    const pod: Action = {
      type: "launch_pod",
      args: { target_x: -120, target_z: -280, payload: "full_life_support" },
      proposedBy: "BASE",
    };
    const judgeVerdict: Verdict = { decision: "allow", reason: "ok", by: "judge" };

    mockState.chat.mockImplementation((tier: string, _msgs: unknown, opts?: { providers?: string[]; signal?: AbortSignal }) => {
      if (tier === "medium" && opts?.providers?.[0] === "vertex") {
        // Voter B (2000 ms timeout) hangs until aborted
        return new Promise((_resolve, reject) => {
          opts?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        });
      }
      return Promise.resolve(makeVoteMsg("allow", 0.9, "Confirmed safe pod coordinates."));
    });

    const t0 = Date.now();
    const res = await runEscalatedVoting(pod, ctx, "Launch O2 pod", [], judgeVerdict);
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeLessThan(2800);
    expect(res).not.toBeNull();
    expect(res!.traceDetail.voters).toHaveLength(VOTER_PANEL.length);
    expect(res!.traceDetail.voters[1].status).toBe("timeout");
    expect(res!.traceDetail.consensus).toBe("degraded_unanimous");
    expect(res!.verdict.decision).toBe("allow");
  });

  it("applies all quorum, tie-breaking, and asymmetric safety override rules from §3.3", () => {
    const judgeAllow: Verdict = { decision: "allow", reason: "judge ok", by: "judge" };
    const judgeAsk: Verdict = { decision: "ask_human", reason: "judge unsure", by: "judge" };
    const rulesSkipAllow: Verdict = { decision: "allow", reason: "rules skip", by: "rules" };

    // 3-0 unanimous
    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", "allow", 0.9), makeVoterResult("Voter B", "allow", 0.85), makeVoterResult("Voter C", "allow", 0.88)],
        judgeAllow,
      ),
    ).toMatchObject({ consensus: "unanimous", finalDecision: "allow", tally: { allow: 3, deny: 0, ask_human: 0, valid: 3 } });

    // 2-1 majority (allow + ask_human)
    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", "allow", 0.9), makeVoterResult("Voter B", "allow", 0.85), makeVoterResult("Voter C", "ask_human", 0.7)],
        judgeAllow,
      ),
    ).toMatchObject({ consensus: "majority", finalDecision: "allow" });

    // 2-1 majority (deny)
    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", "deny", 0.8), makeVoterResult("Voter B", "deny", 0.75), makeVoterResult("Voter C", "allow", 0.6)],
        judgeAllow,
      ),
    ).toMatchObject({ consensus: "majority", finalDecision: "deny" });

    // Asymmetric safety override: 2 allow + 1 deny with confidence >= 0.85 -> ask_human
    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", "allow", 0.9), makeVoterResult("Voter B", "allow", 0.88), makeVoterResult("Voter C", "deny", 0.85)],
        judgeAllow,
      ),
    ).toMatchObject({ consensus: "asymmetric_safety_override", finalDecision: "ask_human" });

    // 2 allow + 1 deny with confidence < 0.85 -> majority allow
    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", "allow", 0.9), makeVoterResult("Voter B", "allow", 0.88), makeVoterResult("Voter C", "deny", 0.7)],
        judgeAllow,
      ),
    ).toMatchObject({ consensus: "majority", finalDecision: "allow" });

    // 1-1-1 three-way split -> ask_human
    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", "allow", 0.8), makeVoterResult("Voter B", "deny", 0.8), makeVoterResult("Voter C", "ask_human", 0.8)],
        judgeAllow,
      ),
    ).toMatchObject({ consensus: "split", finalDecision: "ask_human" });

    // Degraded 2-voter 2-0
    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", "deny", 0.9), makeVoterResult("Voter B", null, null, "timeout"), makeVoterResult("Voter C", "deny", 0.82)],
        judgeAllow,
      ),
    ).toMatchObject({ consensus: "degraded_unanimous", finalDecision: "deny", tally: { valid: 2 } });

    // Degraded 2-voter 1-1 -> ask_human
    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", "allow", 0.9), makeVoterResult("Voter B", null, null, "error"), makeVoterResult("Voter C", "deny", 0.82)],
        judgeAllow,
      ),
    ).toMatchObject({ consensus: "degraded_split", finalDecision: "ask_human", tally: { valid: 2 } });

    // Failed quorum <= 1 -> fallback to Step 2 judge verdict or ask_human
    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", "allow", 0.9), makeVoterResult("Voter B", null, null, "timeout"), makeVoterResult("Voter C", null, null, "error")],
        judgeAllow,
      ),
    ).toMatchObject({ consensus: "quorum_failed", finalDecision: "allow", tally: { valid: 1 } });

    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", null, null, "error"), makeVoterResult("Voter B", null, null, "timeout"), makeVoterResult("Voter C", null, null, "error")],
        judgeAsk,
      ),
    ).toMatchObject({ consensus: "quorum_failed", finalDecision: "ask_human", tally: { valid: 0 } });

    expect(
      tallyAndResolveVotes(
        [makeVoterResult("Voter A", "allow", 0.9), makeVoterResult("Voter B", null, null, "timeout"), makeVoterResult("Voter C", null, null, "error")],
        rulesSkipAllow,
      ),
    ).toMatchObject({ consensus: "quorum_failed", finalDecision: "ask_human", tally: { valid: 1 } });
  });

  it("bypasses voting with 0 calls when offline / !llmAvailable()", async () => {
    mockState.llmOnline = false;
    const ctx = makeContext({ leak_diameter_m: 0.0016 });
    const pod: Action = {
      type: "launch_pod",
      args: { target_x: -120, target_z: -280, payload: "full_life_support" },
      proposedBy: "BASE",
    };

    const res = await runEscalatedVoting(pod, ctx, "Launch O2 pod", [], {
      decision: "ask_human",
      reason: "Offline judge",
      by: "rules",
    });
    expect(res).toBeNull();

    const reviewed = await review(pod, ctx, "Launch O2 pod");
    expect(reviewed).toMatchObject({ decision: "ask_human", by: "rules" });
    expect(mockState.chat).not.toHaveBeenCalled();
  });
});
