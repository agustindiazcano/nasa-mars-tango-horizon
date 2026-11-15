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

export interface EnvLimits extends Limits {
  tauAbort: number;
  maxFlightWindMs: number;
  minFlightDensityKgM3: number;
  sepDoseWarnUgyH: number;
  sepDoseAbortUgyH: number;
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
 * Unified operational environmental limits (single source of truth across shared, MCP tools, and GUARDIAN).
 * - tauVisibility: 1.5 (storm onset threshold from MSL 2018 opacity record; design assumption)
 * - tauAbort: 2.5 (optical opacity EVA abort limit; design assumption)
 * - tauDroneGrounding: 1.8 (dust opacity grounding limit for rotorcraft and glider; design assumption)
 * - maxFlightWindMs: 15.0 (horizontal wind ceiling for rotorcraft/glider operations; design assumption)
 * - minFlightDensityKgM3: 0.012 (minimum Martian surface air density for rotorcraft lift; design assumption)
 * - minPowerMarginW: 500 (required base solar power margin above load; design assumption)
 * - sepDoseWarnUgyH: 25 (elevated absorbed dose rate warning threshold, ~2x RAD quiet baseline; design assumption)
 * - sepDoseAbortUgyH: 80 (acute SEP absorbed dose rate abort threshold requiring shelter; design assumption)
 */
export const ENV_LIMITS: EnvLimits = {
  tauVisibility: 1.5,
  tauAbort: 2.5,
  tauDroneGrounding: 1.8,
  maxFlightWindMs: 15.0,
  minFlightDensityKgM3: 0.012,
  minPowerMarginW: 500,
  sepDoseWarnUgyH: 25,
  sepDoseAbortUgyH: 80,
};

/** Backward-compatible alias of ENV_LIMITS for chance-constrained storm planning callers. */
export const DEFAULT_STORM_LIMITS: EnvLimits = ENV_LIMITS;

/** Dust opacity at or above which drones and gliders are grounded (matches server GUARDIAN). */
export const AIRCRAFT_GROUNDING_TAU = ENV_LIMITS.tauDroneGrounding;

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
 * @param currentTau Dust opacity measured now. When given it replaces the forecast median as the starting
 *   point and counts toward the worst case, so an opacity already past a limit is never reported as "go".
 */
export function decide(
  fc: StormForecast[],
  plan: EvaPlan,
  lim: Limits,
  powerAt: (tau: number) => number,
  demandW: number,
  solSeconds: number = C.mars_sol_s.value,
  currentTau?: number,
): Decision {
  const reasons: string[] = [];
  const maneuvers: Maneuver[] = [];
  if (fc.length === 0) {
    return { verdict: "go", reasons, maneuvers };
  }

  const today = fc.find((f) => f.horizonSol === 1) ?? fc[0];
  const observed = currentTau !== undefined && Number.isFinite(currentTau) ? currentTau : undefined;
  const worst = Math.max(...fc.map((f) => f.q90), observed ?? -Infinity);

  // Time until pessimistic opacity reaches visibility limit, assuming linear rise across the sol.
  const now = observed ?? fc[0].q50;
  const timeToLimitS =
    now >= lim.tauVisibility
      ? 0
      : today.q90 <= lim.tauVisibility
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
