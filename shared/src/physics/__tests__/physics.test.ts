import { describe, it, expect } from "vitest";
import { C } from "../constants.js";
import {
  leakMassFlow,
  timeToPressure,
  isChoked,
  leakTimeline,
  alveolarPO2,
  suitPressureForPAO2,
  dPdt,
} from "../suitLeak.js";
import * as orifice from "../orifice.js";
import {
  metabolicRateW,
  o2LitersPerMin,
  o2KgPerHour,
  co2LitersPerMin,
  terrainFromThermalClass,
} from "../metabolic.js";
import {
  surfaceDensity,
  densityAt,
  windAt,
  directTransmission,
} from "../atmosphere.js";
import { simulatePod, vacuumLaunchVelocity } from "../ballistic.js";
import * as ballistics from "../ballistics.js";
import {
  terminalSpeed,
  maxRangeVacuum,
  launchLoadG,
  simulateDelivery,
  aimDelivery,
  landingEllipse,
  mulberry32,
} from "../podDelivery.js";
import { doseRate, doseRateWithAlbedo, cumulativeDose } from "../dose.js";
import * as radiation from "../radiation.js";
import { solarPowerW, estimateSolarPower } from "../solar.js";
import { createInitialSuitState, stepSuitState } from "../suitState.js";
import { stepSuitTelemetry, type SimSuitTelemetry } from "../suitTelemetry.js";
import { planRoute, type Grid } from "../route.js";

describe("constants provenance", () => {
  it("every constant has a unit and non-empty English source", () => {
    for (const [key, entry] of Object.entries(C)) {
      expect(entry.unit.length, `${key} unit`).toBeGreaterThan(0);
      expect(entry.source.length, `${key} source`).toBeGreaterThan(3);
      expect(Number.isFinite(entry.value), `${key} value`).toBe(true);
    }
  });
});

describe("suit leak thermodynamics", () => {
  it("flow is choked against the Martian atmosphere", () => {
    expect(isChoked(29600, 780)).toBe(true);
    expect(isChoked(1000, 780)).toBe(false);
  });

  it("time to Armstrong limit with a 1.6 mm hole is ~891 s", () => {
    const t = timeToPressure(29600, 6250, 0.0016);
    expect(t).toBeGreaterThan(880);
    expect(t).toBeLessThan(900);
  });

  it("mass flow scales linearly with upstream pressure", () => {
    expect(
      leakMassFlow(29600, 0.0016) / leakMassFlow(14800, 0.0016),
    ).toBeCloseTo(2, 6);
  });

  it("hypoxia thresholds occur before Armstrong limit (~890 s)", () => {
    const t = leakTimeline(29600, 0.0016);
    expect(t.toImpairedS).toBeLessThan(t.toCriticalS);
    expect(t.toCriticalS).toBeLessThan(t.toArmstrongS);
    expect(t.toCriticalS).toBeCloseTo(367.15, 0);
    expect(t.toArmstrongS).toBeCloseTo(889.6, 0);
  });

  it("alveolar PO2 at nominal suit pressure is physiologically adequate", () => {
    expect(alveolarPO2(29600)).toBeGreaterThan(13000);
    expect(suitPressureForPAO2(alveolarPO2(29600))).toBeCloseTo(29600, 6);
  });

  it("dPdt is negative with zero makeup during a leak and orifice alias matches", () => {
    expect(dPdt(29600, 0.0016, 0, 0)).toBeLessThan(0);
    expect(orifice.leakTimeline).toBe(leakTimeline);
  });
});

describe("metabolic model (Pandolf-Santee)", () => {
  const base = {
    bodyKg: 78,
    loadKg: 65,
    speed: 1.0,
    gradePct: 0,
    terrain: 1.1,
  };

  it("uphill costs more than flat, and gentle downhill costs at most flat", () => {
    const flat = metabolicRateW(base);
    expect(metabolicRateW({ ...base, gradePct: 10 })).toBeGreaterThan(flat);
    expect(metabolicRateW({ ...base, gradePct: -5 })).toBeLessThanOrEqual(flat);
  });

  it("loose sand costs more than consolidated bedrock", () => {
    expect(
      metabolicRateW({ ...base, terrain: terrainFromThermalClass(0) }),
    ).toBeGreaterThan(
      metabolicRateW({ ...base, terrain: terrainFromThermalClass(2) }),
    );
  });

  it("300 W corresponds to ~0.896 L/min O2 uptake", () => {
    expect(o2LitersPerMin(300)).toBeCloseTo(0.896, 2);
    expect(o2KgPerHour(300)).toBeGreaterThan(0.07);
    expect(co2LitersPerMin(300)).toBeCloseTo(o2LitersPerMin(300) * 0.85, 5);
  });
});

describe("atmosphere and ballistics", () => {
  it("surface density at 750 Pa and 220 K is ~0.0178 kg/m^3", () => {
    expect(surfaceDensity(750, 220)).toBeCloseTo(0.0178, 3);
  });

  it("density decays with altitude and wind follows log profile above z0", () => {
    expect(densityAt(0.018, 11100)).toBeCloseTo(0.018 / Math.E, 5);
    expect(windAt(0.005, 10)).toBe(0);
    expect(windAt(1.6, 10)).toBeCloseTo(10, 6);
    expect(windAt(20, 10)).toBeGreaterThan(10);
    expect(directTransmission(0, 1)).toBe(1);
    expect(directTransmission(1, 0)).toBe(0);
  });

  it("without atmosphere, ballistic range matches the vacuum formula", () => {
    const v = 40;
    const a = Math.PI / 4;
    const tr = simulatePod(
      [0, 0, 0.01],
      [v * Math.cos(a), 0, v * Math.sin(a)],
      { massKg: 3, cd: 0.5, areaM2: 0.03 },
      { rho0: 0, windRef: 0, windDirRad: 0, groundZ: () => 0 },
      0.01,
    );
    expect(tr.at(-1)!.p[0]).toBeCloseTo((v * v) / C.g_mars.value, 0);
    expect(ballistics.simulatePod).toBe(simulatePod);
  });

  it("vacuumLaunchVelocity hits target in zero drag", () => {
    const v0 = vacuumLaunchVelocity([0, 0, 0], [800, 600, 0], Math.PI / 4);
    expect(v0).not.toBeNull();
    const tr = simulatePod(
      [0, 0, 0.01],
      v0!,
      { massKg: 3.8, cd: 0.47, areaM2: 0.0314 },
      { rho0: 0, windRef: 0, windDirRad: 0, groundZ: () => 0 },
      0.02,
    );
    const hit = tr.at(-1)!.p;
    expect(Math.hypot(hit[0] - 800, hit[1] - 600)).toBeLessThan(3);
  });
});

describe("pod delivery (parachute, range, launch load, landing ellipse)", () => {
  it("terminal speed under canopy: 3 kg, CdA 12.4 m^2, rho 0.018 -> ~10 m/s", () => {
    expect(terminalSpeed(3, 0.018, 12.4)).toBeCloseTo(10.0, 0);
  });

  it("vacuum range at 86 m/s is ~2 km and 90 m/s from 6 m tube is ~69 g", () => {
    expect(maxRangeVacuum(86)).toBeCloseTo(1993, -1);
    expect(launchLoadG(90, 6)).toBeCloseTo(68.8, 0);
  });

  it("with a parachute the pod lands far slower than without, and later", () => {
    const env = { rho0: 0.018, windRef: 0, windDirRad: 0, groundZ: () => 0 };
    const pod = { massKg: 3, cdA: 0.015 };
    const v0: [number, number, number] = [43, 0, 43];
    const bare = simulateDelivery([0, 0, 0.01], v0, pod, null, env);
    const chuted = simulateDelivery(
      [0, 0, 0.01],
      v0,
      pod,
      { cdA: 12.4, deployBelowM: 150, inflateS: 1 },
      env,
    );
    expect(chuted.verticalImpactSpeed).toBeLessThan(15);
    expect(bare.impactSpeed).toBeGreaterThan(50);
    expect(chuted.flightTimeS).toBeGreaterThan(bare.flightTimeS);
  });

  it("iterative aim correction lands within 5 m under crosswind", () => {
    const env = {
      rho0: 0.018,
      windRef: 12,
      windDirRad: Math.PI / 2,
      groundZ: () => 0,
    };
    const pod = { massKg: 3.8, cdA: 0.015 };
    const chute = { cdA: 12.4, deployBelowM: 120, inflateS: 1.0 };
    const aimed = aimDelivery(
      [0, 0, 0.01],
      [900, 0, 0],
      (45 * Math.PI) / 180,
      pod,
      chute,
      env,
    );
    expect(aimed).not.toBeNull();
    expect(aimed!.missM).toBeLessThan(5);
  });

  it("landingEllipse is deterministic and expands with stronger wind sigma", () => {
    const pod = { massKg: 3.8, cdA: 0.015 };
    const chute = { cdA: 12.4, deployBelowM: 120, inflateS: 1.0 };
    const v0: [number, number, number] = [43, 0, 43];
    const run = (w: number, dir: number) =>
      simulateDelivery([0, 0, 0.01], v0, pod, chute, {
        rho0: 0.018,
        windRef: w,
        windDirRad: dir,
        groundZ: () => 0,
      }).impact;

    const calm = landingEllipse(
      run,
      { speed: 5, speedSigma: 1, dirRad: 0, dirSigmaRad: 0.05 },
      40,
      7,
    );
    const calmRepeat = landingEllipse(
      run,
      { speed: 5, speedSigma: 1, dirRad: 0, dirSigmaRad: 0.05 },
      40,
      7,
    );
    const storm = landingEllipse(
      run,
      { speed: 18, speedSigma: 5, dirRad: 0, dirSigmaRad: 0.25 },
      40,
      7,
    );
    expect(calm.samples).toEqual(calmRepeat.samples);
    expect(storm.alongM).toBeGreaterThan(calm.alongM);
    expect(storm.crossM).toBeGreaterThan(calm.crossM);
  });
});

describe("radiation dose and solar power", () => {
  it("doseRate applies geometric SVF shielding and cumulativeDose integrates along route", () => {
    expect(doseRate(100, 0.25)).toBeCloseTo(25, 6);
    expect(doseRateWithAlbedo(100, 0.2, 0.09)).toBeCloseTo(27.2, 6);
    expect(cumulativeDose({ timeS: 1800, meanSvf: 0.5 }, 40)).toBeCloseTo(10, 6);
    expect(
      cumulativeDose(
        [
          { svf: 1.0, dtS: 1800 },
          { svf: 0.2, dtS: 1800 },
        ],
        40,
      ),
    ).toBeCloseTo(24, 6);
    expect(radiation.doseRate).toBe(doseRate);
  });

  it("solarPowerW computes direct-beam output and drops under dust opacity", () => {
    const clear = solarPowerW(0.3, 0.8, 100, 0.22);
    const storm = solarPowerW(4.0, 0.8, 100, 0.22);
    expect(clear).toBeGreaterThan(storm);
    expect(solarPowerW(0.5, 0, 100, 0.22)).toBe(0);
    const est = estimateSolarPower({
      tau: 0.5,
      mu: 0.8,
      areaM2: 100,
      efficiency: 0.22,
    });
    expect(est.model).toBe("direct_beam_only");
    expect(est.label).toContain("direct beam");
  });
});

describe("suitState 1 Hz fixed-step integrator", () => {
  it("drains primary O2, battery, and coolant nominally while holding pressure", () => {
    let s = createInitialSuitState();
    const p0 = s.o2_primary_kg;
    const b0 = s.battery_wh;
    const c0 = s.coolant_l;
    for (let i = 0; i < 60; i++) {
      s = stepSuitState(s, { metabolicW: 320, leakDiameterM: 0, mode: "eva" });
    }
    expect(s.elapsed_s).toBe(60);
    expect(s.o2_primary_kg).toBeLessThan(p0);
    expect(s.battery_wh).toBeLessThan(b0);
    expect(s.coolant_l).toBeLessThan(c0);
    expect(s.suit_pressure_pa).toBeCloseTo(C.suit_p_nominal.value, -1);
  });

  it("emergency leak drains reserve O2 and depressurizes suit after reserve runs out", () => {
    let s = createInitialSuitState({ o2_primary_kg: 0, o2_reserve_kg: 0.005 });
    for (let i = 0; i < 400; i++) {
      s = stepSuitState(s, {
        metabolicW: 400,
        leakDiameterM: 0.0016,
        mode: "emergency",
      });
    }
    expect(s.o2_reserve_kg).toBe(0);
    expect(s.suit_pressure_pa).toBeLessThan(20000);
  });
});

describe("A* EVA route planner", () => {
  it("avoids cliffs above maxSlopeDeg and prefers lower-SVF path when doseWeight > 0", () => {
    const n = 7;
    const size = n * n;
    const z = new Float32Array(size).fill(0);
    const terrain = new Float32Array(size).fill(1.1);
    const doseRel = new Float32Array(size).fill(0.9);

    // Impassable ridge across middle row y=3 except x=6
    for (let x = 0; x < 6; x++) z[3 * n + x] = 25;
    // Lower SVF shelter corridor along x=6
    for (let y = 0; y < n; y++) doseRel[y * n + 6] = 0.2;

    const grid: Grid = { n, cellM: 10, z, terrain, doseRel };
    const res = planRoute(grid, 0, 6 * n + 0, {
      bodyKg: 78,
      loadKg: 65,
      speed: 1.0,
      maxSlopeDeg: 25,
      doseWeight: 1.5,
    });
    expect(res).not.toBeNull();
    expect(res!.path[0]).toBe(0);
    expect(res!.path.at(-1)).toBe(6 * n + 0);
    // Must pass through the gap at (6, 3)
    expect(res!.path).toContain(3 * n + 6);
  });

  it("returns null when goal is completely walled off", () => {
    const n = 5;
    const z = new Float32Array(n * n).fill(0);
    for (let x = 0; x < n; x++) z[2 * n + x] = 100;
    const grid: Grid = {
      n,
      cellM: 10,
      z,
      terrain: new Float32Array(n * n).fill(1),
      doseRel: new Float32Array(n * n).fill(1),
    };
    expect(
      planRoute(grid, 0, n * n - 1, {
        bodyKg: 78,
        loadKg: 65,
        speed: 1,
        maxSlopeDeg: 20,
        doseWeight: 0,
      }),
    ).toBeNull();
  });
});

describe("stepSuitTelemetry and mulberry32", () => {
  it("steps PLSS telemetry under nominal and degraded-fan leak conditions", () => {
    const base: SimSuitTelemetry = {
      o2_primary_kg: 1.08,
      o2_primary_cap_kg: 1.08,
      o2_reserve_kg: 0.45,
      o2_reserve_cap_kg: 0.45,
      suit_pressure_pa: 29600,
      pao2_pa: 23000,
      co2_pa: 220,
      battery_wh: 740,
      battery_cap_wh: 740,
      coolant_l: 4.5,
      coolant_cap_l: 4.5,
      metabolic_w: 240,
      heart_rate_bpm: 84,
      fan_rpm: 28400,
      body_temp_c: 36.9,
      cumulative_dose_ugy: 0,
    };
    const nom = stepSuitTelemetry(base, 10, 320, 0, 20, 0.5, false);
    expect(nom.o2_primary_kg).toBeLessThan(base.o2_primary_kg);
    expect(nom.battery_wh).toBeLessThan(base.battery_wh);
    expect(nom.cumulative_dose_ugy).toBeCloseTo((20 * 0.5 * 10) / 3600, 6);

    const leak = stepSuitTelemetry(base, 10, 360, 0.002, 20, 1.0, true);
    expect(leak.suit_pressure_pa).toBeLessThan(base.suit_pressure_pa);
    expect(leak.o2_reserve_kg).toBeLessThan(base.o2_reserve_kg);
    expect(leak.co2_pa).toBeGreaterThan(base.co2_pa);
    expect(leak.fan_rpm).toBeLessThan(base.fan_rpm);
  });

  it("mulberry32 returns reproducible [0, 1) draws for identical seeds", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 5; i++) {
      const va = a();
      expect(va).toBeGreaterThanOrEqual(0);
      expect(va).toBeLessThan(1);
      expect(va).toBe(b());
    }
  });
});
