import { C } from "./constants.js";

export interface StormForecast {
  horizonSol: number;
  q10: number;
  q50: number;
  q90: number;
}

export interface EvaPlan {
  durationS: number;
  returnToShelterS: number;
}

export interface Limits {
  tauVisibility: number;
  tauDroneGrounding: number;
  minPowerMarginW: number;
}

export type Maneuver =
  | "shorten_eva"
  | "reroute_near_rover"
  | "preposition_rover"
  | "recall_aircraft"
  | "charge_batteries"
  | "switch_to_fission"
  | "postpone";

export interface Decision {
  verdict: "go" | "go_with_changes" | "no_go";
  reasons: string[]; // i18n keys resolved by the UI
  maneuvers: Maneuver[];
}

/**
 * Operational storm thresholds (one central definition).
 * - tauVisibility: 1.5 (storm onset threshold from MSL 2018 opacity record; design assumption)
 * - tauDroneGrounding: 1.2 (optical/dust grounding limit for rotorcraft; design assumption)
 * - minPowerMarginW: 500 (required base solar power margin above load; design assumption)
 */
export const DEFAULT_STORM_LIMITS: Limits = {
  tauVisibility: 1.5,
  tauDroneGrounding: 1.2,
  minPowerMarginW: 500,
};

/**
 * Chance-constrained EVA weather check: the plan must remain valid at the pessimistic
 * (90th percentile) dust opacity forecast across horizons.
 *
 * @param fc Forecast quantiles across upcoming sols.
 * @param plan Planned EVA duration and return-to-shelter margin in seconds.
 * @param lim Safety thresholds.
 * @param powerAt Base solar output callback (W) as a function of opacity tau (e.g. from solar.ts).
 * @param demandW Current base electrical load (W).
 * @param solSeconds Duration of one Martian sol in seconds (default 88775 s).
 */
export function decide(
  fc: StormForecast[],
  plan: EvaPlan,
  lim: Limits,
  powerAt: (tau: number) => number,
  demandW: number,
  solSeconds: number = C.mars_sol_s.value,
): Decision {
  const reasons: string[] = [];
  const maneuvers: Maneuver[] = [];
  if (fc.length === 0) {
    return { verdict: "go", reasons, maneuvers };
  }

  const today = fc.find((f) => f.horizonSol === 1) ?? fc[0];
  const worst = Math.max(...fc.map((f) => f.q90));

  // Time until pessimistic opacity reaches visibility limit, assuming linear rise across the sol.
  const now = fc[0].q50;
  const timeToLimitS =
    today.q90 <= lim.tauVisibility
      ? Infinity
      : Math.max(
          0,
          ((lim.tauVisibility - now) / Math.max(today.q90 - now, 1e-6)) *
            solSeconds,
        );

  if (plan.durationS + plan.returnToShelterS > timeToLimitS) {
    reasons.push("storm.reason.return_margin");
    if (plan.returnToShelterS < timeToLimitS) {
      maneuvers.push("shorten_eva", "preposition_rover");
    } else {
      maneuvers.push("postpone");
    }
  }

  if (worst >= lim.tauDroneGrounding) {
    reasons.push("storm.reason.aircraft");
    maneuvers.push("recall_aircraft");
  }

  if (powerAt(worst) - demandW < lim.minPowerMarginW) {
    reasons.push("storm.reason.power");
    maneuvers.push("charge_batteries", "switch_to_fission");
  }

  const verdict = maneuvers.includes("postpone")
    ? "no_go"
    : maneuvers.length
      ? "go_with_changes"
      : "go";

  return {
    verdict,
    reasons,
    maneuvers: [...new Set(maneuvers)],
  };
}
