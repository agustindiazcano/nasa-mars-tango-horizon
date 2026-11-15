import { describe, it, expect } from "vitest";
import { decide, DEFAULT_STORM_LIMITS } from "../stormDecision.js";
import { solarPowerW } from "../solar.js";

describe("stormDecision chance-constrained planner", () => {
  const powerAt = (tau: number) => solarPowerW(tau, 0.75, 45, 0.22);

  it("returns go when forecast stays clear and power margin holds", () => {
    const res = decide(
      [
        { horizonSol: 1, q10: 0.3, q50: 0.4, q90: 0.55 },
        { horizonSol: 2, q10: 0.3, q50: 0.45, q90: 0.65 },
      ],
      { durationS: 14400, returnToShelterS: 1800 },
      DEFAULT_STORM_LIMITS,
      powerAt,
      1200,
    );
    expect(res.verdict).toBe("go");
    expect(res.maneuvers).toEqual([]);
    expect(res.reasons).toEqual([]);
  });

  it("proposes shorten_eva and preposition_rover when crossing visibility mid-EVA", () => {
    // timeToLimitS = ((1.5 - 0.8) / (2.2 - 0.8)) * 88775 = 44387.5 s
    const res = decide(
      [{ horizonSol: 1, q10: 0.6, q50: 0.8, q90: 2.2 }],
      { durationS: 44000, returnToShelterS: 3600 },
      { tauVisibility: 1.5, tauDroneGrounding: 3.0, minPowerMarginW: 100 },
      () => 5000,
      1000,
      88775,
    );
    expect(res.verdict).toBe("go_with_changes");
    expect(res.reasons).toContain("storm.reason.return_margin");
    expect(res.maneuvers).toContain("shorten_eva");
    expect(res.maneuvers).toContain("preposition_rover");
  });

  it("returns no_go and postpone when return time exceeds time to visibility limit", () => {
    const res = decide(
      [{ horizonSol: 1, q10: 1.2, q50: 1.4, q90: 3.4 }],
      { durationS: 7200, returnToShelterS: 7200 },
      DEFAULT_STORM_LIMITS,
      powerAt,
      1500,
      88775,
    );
    expect(res.verdict).toBe("no_go");
    expect(res.maneuvers).toContain("postpone");
    expect(res.maneuvers).toContain("recall_aircraft");
    expect(res.maneuvers).toContain("charge_batteries");
    expect(res.maneuvers).toContain("switch_to_fission");
    expect(res.reasons).toEqual([
      "storm.reason.return_margin",
      "storm.reason.aircraft",
      "storm.reason.power",
    ]);
  });

  it("grounds aircraft and switches power even if horizon 1 is calm but horizon 2 worsens", () => {
    const res = decide(
      [
        { horizonSol: 1, q10: 0.3, q50: 0.4, q90: 0.6 },
        { horizonSol: 2, q10: 0.9, q50: 1.3, q90: 1.9 },
      ],
      { durationS: 7200, returnToShelterS: 1200 },
      DEFAULT_STORM_LIMITS,
      powerAt,
      1800,
    );
    expect(res.verdict).toBe("go_with_changes");
    expect(res.maneuvers).toContain("recall_aircraft");
    expect(res.maneuvers).toContain("switch_to_fission");
  });

  it("returns no_go when the measured opacity is already past the visibility limit", () => {
    const clear = [
      { horizonSol: 1, q10: 0.3, q50: 0.4, q90: 0.55 },
      { horizonSol: 2, q10: 0.3, q50: 0.45, q90: 0.65 },
    ];
    const plan = { durationS: 7200, returnToShelterS: 1500 };
    const stormy = decide(clear, plan, DEFAULT_STORM_LIMITS, powerAt, 1200, undefined, 3.0);
    expect(stormy.verdict).toBe("no_go");
    expect(stormy.maneuvers).toContain("postpone");
    expect(stormy.maneuvers).toContain("recall_aircraft");
    // Same forecast with a clear measured opacity keeps the forecast-only result.
    expect(decide(clear, plan, DEFAULT_STORM_LIMITS, powerAt, 1200, undefined, 0.4).verdict).toBe("go");
  });
});
