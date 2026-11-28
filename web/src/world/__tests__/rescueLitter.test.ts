import { describe, expect, it } from "vitest";
import {
  BRIDLE_APEX_LOCAL,
  cablePoints,
  CABLE_REST_LENGTH_M,
  litterPointToWorld,
  litterTilt,
  LITTER,
  type V3,
} from "../rescueLitter";
import { RescueScenario } from "../rescueScenario";

describe("litter tilt on a slope", () => {
  it("is level on flat ground", () => {
    const t = litterTilt(() => 5, 10, 10, 0.7);
    expect(t.pitch).toBeCloseTo(0, 6);
    expect(t.roll).toBeCloseTo(0, 6);
  });

  it("raises the head end when the ground rises ahead (nose up is a negative rotation about x)", () => {
    // Heading +z (yaw 0) on a ground that rises 0.2 m per metre along +z
    const t = litterTilt((_x, z) => 0.2 * z, 0, 0, 0);
    expect(t.pitch).toBeCloseTo(-Math.atan(0.2), 3);
    expect(Math.abs(t.roll)).toBeLessThan(1e-6);
  });

  it("rolls toward the side that is higher", () => {
    // Yaw 0: the litter +x side is world +x; ground rises 0.1 m per metre along +x
    const t = litterTilt((x) => 0.1 * x, 0, 0, 0);
    expect(t.roll).toBeCloseTo(Math.atan(0.1), 3);
  });
});

describe("litter attachment geometry", () => {
  it("maps litter-local points with front = +Z", () => {
    const yaw = Math.PI / 2; // facing +X
    const p = litterPointToWorld([10, 2, 20], yaw, [0, 0.5, 3]);
    expect(p[0]).toBeCloseTo(13, 6);
    expect(p[1]).toBeCloseTo(2.5, 6);
    expect(p[2]).toBeCloseTo(20, 6);
    const side = litterPointToWorld([0, 0, 0], yaw, [1, 0, 0]);
    expect(side[0]).toBeCloseTo(0, 6);
    expect(side[2]).toBeCloseTo(-1, 6);
  });

  it("keeps the cable ends exact, taut beyond the rest length and sagging below it", () => {
    const a: V3 = [0, 1, 0];
    const far: V3 = [0, 1, CABLE_REST_LENGTH_M + 1];
    const taut = cablePoints(a, far);
    expect(taut[0]).toEqual(a);
    expect(taut[taut.length - 1]).toEqual(far);
    for (const p of taut) expect(p[1]).toBeCloseTo(1, 9);
    const near: V3 = [0, 1, 1.5];
    const slack = cablePoints(a, near);
    expect(slack[slack.length - 1]).toEqual(near);
    const lowest = Math.min(...slack.map((p) => p[1]));
    expect(lowest).toBeLessThan(1 - 0.05);
    expect(lowest).toBeGreaterThan(1 - 0.8);
  });

  it("puts the bridle apex ahead of the head end of the litter in the travel direction", () => {
    expect(BRIDLE_APEX_LOCAL[2]).toBeGreaterThan(LITTER.headZ);
    const yaw = 0.7;
    const apex = litterPointToWorld([5, 0, 5], yaw, [...BRIDLE_APEX_LOCAL] as V3);
    const dir: [number, number] = [Math.sin(yaw), Math.cos(yaw)];
    const along = (apex[0] - 5) * dir[0] + (apex[2] - 5) * dir[1];
    expect(along).toBeCloseTo(BRIDLE_APEX_LOCAL[2], 6);
  });
});

describe("scenario litter state", () => {
  it("attaches the litter when the robot secures the harness and releases it when the casualty is loaded", () => {
    const sc = new RescueScenario({ heightAt: () => 0 });
    const at = (t: number) => {
      sc.seekTo(t);
      return sc.view.litter.active;
    };
    expect(at(100)).toBe(false);
    expect(at(143)).toBe(false);
    expect(at(146)).toBe(true);
    expect(at(160)).toBe(true);
    expect(at(172)).toBe(false);
  });
});
