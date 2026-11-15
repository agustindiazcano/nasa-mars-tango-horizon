import { describe, expect, it } from "vitest";
import {
  cassonApparentViscosity,
  cassonShearStress,
  estimateCassonTwin,
  PA_PER_MMHG,
} from "../cassonTwin";

describe("Casson law", () => {
  it("apparent viscosity equals tau / gamma_dot", () => {
    const tauY = 0.005;
    const eta = 0.004;
    const g = 50;
    expect(cassonApparentViscosity(tauY, eta, g)).toBeCloseTo(cassonShearStress(tauY, eta, g) / g, 12);
  });

  it("tends to eta_c at high shear and rises at low shear", () => {
    const hi = cassonApparentViscosity(0.005, 0.004, 1e8);
    expect(hi).toBeCloseTo(0.004, 5);
    expect(cassonApparentViscosity(0.005, 0.004, 1)).toBeGreaterThan(hi);
  });

  it("rejects non-positive shear rate", () => {
    expect(() => cassonApparentViscosity(0.005, 0.004, 0)).toThrow(RangeError);
  });
});

describe("estimateCassonTwin", () => {
  it("returns baseline values at rest with no CO2", () => {
    const t = estimateCassonTwin({ helmetCo2Pa: 0, metabolicW: 0, evaTimeS: 0 });
    expect(t.hematocrit).toBeCloseTo(0.45, 6);
    expect(t.paco2Mmhg).toBeCloseTo(40, 6);
    expect(t.relativeViscosity).toBeCloseTo(1, 6);
    expect(t.status).toBe("ok");
    expect(t.viscosityHighShearPaS).toBeGreaterThan(0.003);
    expect(t.viscosityHighShearPaS).toBeLessThan(0.008);
  });

  it("hypercapnia raises PaCO2, viscosity and status", () => {
    const base = estimateCassonTwin({ helmetCo2Pa: 0, metabolicW: 250, evaTimeS: 3600 });
    const high = estimateCassonTwin({ helmetCo2Pa: 10 * PA_PER_MMHG, metabolicW: 250, evaTimeS: 3600 });
    expect(high.paco2Mmhg).toBeCloseTo(49, 6);
    expect(high.relativeViscosity).toBeGreaterThan(base.relativeViscosity);
    expect(high.status).toBe("warn");
    expect(estimateCassonTwin({ helmetCo2Pa: 20 * PA_PER_MMHG, metabolicW: 0, evaTimeS: 0 }).status).toBe("crit");
  });

  it("longer, harder EVA raises hematocrit and is capped", () => {
    const a = estimateCassonTwin({ helmetCo2Pa: 0, metabolicW: 300, evaTimeS: 7200 });
    expect(a.hematocrit).toBeGreaterThan(0.45);
    expect(estimateCassonTwin({ helmetCo2Pa: 0, metabolicW: 1e6, evaTimeS: 1e9 }).hematocrit).toBe(0.65);
  });

  it("is deterministic", () => {
    const i = { helmetCo2Pa: 400, metabolicW: 220, evaTimeS: 1420 };
    expect(estimateCassonTwin(i)).toEqual(estimateCassonTwin(i));
  });
});
