import { describe, expect, it, vi } from "vitest";
import type { MissionContext } from "../types.js";

vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => false,
  chat: vi.fn(),
}));

import { ruleCheck } from "../guardian.js";
import { needsLeakSafetyNet } from "../hierarchy.js";
import { buildContext } from "../routes.js";

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    lang: "en",
    met_s: 600,
    astronaut: { x: -160, z: -280, body_kg: 78, load_kg: 65, speed: 0 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2, o2_reserve_kg: 0.5 },
    leak_diameter_m: 0,
    env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 10 },
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: -120, z: -300, battery: 0.8, busy: false },
      { id: "drone-1", kind: "drone", x: -170, z: -290, battery: 0.85, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

const withTau = (tau: number) => makeContext({ env: { ...makeContext().env, tau } });

describe("GUARDIAN aircraft grounding", () => {
  const photo = { type: "unit_action", args: { unit_id: "drone-1", action: "photograph_area", x: -150, z: -280 }, proposedBy: "BASE" };
  const dispatch = { type: "dispatch", args: { unit_id: "drone-1", x: -150, z: -280 }, proposedBy: "BASE" };

  it("denies drone photograph_area and dispatch at tau 2.2, allows them at 0.5", () => {
    expect(ruleCheck(photo, withTau(2.2))?.decision).toBe("deny");
    expect(ruleCheck(dispatch, withTau(2.2))?.decision).toBe("deny");
    expect(ruleCheck(photo, withTau(0.5))?.decision).not.toBe("deny");
    expect(ruleCheck(dispatch, withTau(0.5))?.decision).not.toBe("deny");
  });

  it("grounds at exactly tau 1.8", () => {
    expect(ruleCheck(photo, withTau(1.8))?.decision).toBe("deny");
  });

  it("allows land and hold_position at tau 2.2", () => {
    for (const action of ["land", "hold_position"]) {
      const v = ruleCheck({ type: "unit_action", args: { unit_id: "drone-1", action }, proposedBy: "BASE" }, withTau(2.2));
      expect(v?.decision).not.toBe("deny");
    }
  });

  it("denies drone actions below 15% battery", () => {
    const ctx = makeContext({
      fleet: [{ id: "drone-1", kind: "drone", x: -170, z: -290, battery: 0.12, busy: false }],
    });
    expect(ruleCheck(photo, ctx)?.decision).toBe("deny");
  });

  it("does not ground ground rovers", () => {
    const v = ruleCheck({ type: "dispatch", args: { unit_id: "rover-1", x: -130, z: -270 }, proposedBy: "BASE" }, withTau(2.2));
    expect(v?.decision).not.toBe("deny");
  });
});

describe("leak safety net", () => {
  const leak = makeContext({ leak_diameter_m: 0.0016 });

  it("runs on the first emergency order without a launch_pod", () => {
    expect(needsLeakSafetyNet(leak, [])).toBe(true);
  });

  it("is skipped when the reply already has a launch_pod", () => {
    expect(needsLeakSafetyNet(leak, [{ type: "launch_pod" }])).toBe(false);
  });

  it("is skipped once the emergency response is active", () => {
    expect(needsLeakSafetyNet({ ...leak, emergency_response_active: true }, [])).toBe(false);
  });

  it("is skipped without a leak", () => {
    expect(needsLeakSafetyNet(makeContext(), [])).toBe(false);
  });
});

describe("buildContext sanitization", () => {
  it("drops malformed fleet entries and caps the fleet at 32", () => {
    const good = { id: "rover-1", kind: "rover_crew", x: 1, z: 2, battery: 0.5, busy: 1 };
    const ctx = buildContext(
      { fleet: [good, { id: "a", kind: "drone", z: 1, battery: 0.5 }, { id: "b", kind: "drone", x: 1, z: 1, battery: "x" }, null, 7, { kind: "drone", x: 1, z: 1, battery: 1 }] },
      "en",
    );
    expect(ctx.fleet).toEqual([{ ...good, busy: true }]);
    const many = Array.from({ length: 50 }, (_, i) => ({ ...good, id: `u${i}` }));
    expect(buildContext({ fleet: many }, "en").fleet).toHaveLength(32);
  });

  it("falls back to defaults for non-finite numeric fields", () => {
    const ctx = buildContext({ astronaut: { x: "abc", z: null, speed: NaN }, env: { tau: "nope", wind_ms: Infinity } }, "en");
    expect(ctx.astronaut.x).toBe(0);
    expect(ctx.astronaut.speed).toBe(0);
    expect(ctx.astronaut.body_kg).toBe(78);
    expect(ctx.env.tau).toBe(0.5);
    expect(ctx.env.wind_ms).toBe(6);
  });

  it("drops malformed targets and storm forecast points", () => {
    const ctx = buildContext(
      {
        targets: [{ id: "T1", kind: "rock", distance_m: 5 }, { id: "T2" }],
        storm_forecast: [{ horizonSol: 1, q10: 0.1, q50: 0.2, q90: 0.3 }, { horizonSol: 2 }],
      },
      "en",
    );
    expect(ctx.targets).toEqual([{ id: "T1", kind: "rock", distance_m: 5 }]);
    expect(ctx.storm_forecast).toHaveLength(1);
  });

  it("keeps emergency_response_active only when true", () => {
    expect(buildContext({ emergency_response_active: true }, "en").emergency_response_active).toBe(true);
    expect(buildContext({ emergency_response_active: "yes" }, "en").emergency_response_active).toBe(false);
  });
});
