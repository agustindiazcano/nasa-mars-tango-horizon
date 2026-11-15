import { describe, expect, it } from "vitest";
import { MARS_G, pendulumPeriod, stepPendulum } from "../skyCraneProc";

const params = { length: 22, g: MARS_G, damping: 0 };

function energy(s: { theta: number; omega: number }): number {
  const { length: L, g } = params;
  return 0.5 * L * L * s.omega * s.omega + g * L * (1 - Math.cos(s.theta));
}

describe("stepPendulum", () => {
  it("stays at rest when hanging straight with no anchor motion", () => {
    const s = stepPendulum({ theta: 0, omega: 0 }, 1, params);
    expect(s.theta).toBeCloseTo(0, 12);
    expect(s.omega).toBeCloseTo(0, 12);
  });

  it("swings with the small-angle period 2*pi*sqrt(L/g)", () => {
    let s = { theta: 0.05, omega: 0 };
    const T = pendulumPeriod(params.length, params.g);
    const dt = 0.005;
    let t = 0;
    let crossings = 0;
    let prev = s.theta;
    while (t < T * 2) {
      s = stepPendulum(s, dt, params);
      t += dt;
      if (prev > 0 && s.theta <= 0) crossings++;
      prev = s.theta;
    }
    // Two periods give two downward zero crossings.
    expect(crossings).toBe(2);
  });

  it("conserves energy approximately without damping", () => {
    let s = { theta: 0.4, omega: 0 };
    const e0 = energy(s);
    for (let i = 0; i < 2000; i++) s = stepPendulum(s, 0.02, params);
    expect(Math.abs(energy(s) - e0) / e0).toBeLessThan(0.05);
  });

  it("damping decays the amplitude", () => {
    let s = { theta: 0.4, omega: 0 };
    for (let i = 0; i < 5000; i++) s = stepPendulum(s, 0.02, { ...params, damping: 0.2 });
    expect(Math.abs(s.theta)).toBeLessThan(0.01);
  });

  it("anchor acceleration deflects the tether opposite to the push", () => {
    let s = { theta: 0, omega: 0 };
    s = stepPendulum(s, 0.2, params, 3);
    expect(s.theta).toBeLessThan(0);
  });
});
