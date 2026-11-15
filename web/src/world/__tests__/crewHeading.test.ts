import { describe, expect, it } from "vitest";
import { crewForward, playerGroupYaw } from "../crewProc";

const yawOf = (dx: number, dz: number) => Math.atan2(dx, dz);

describe("crew heading convention", () => {
  it("faces the travel direction when the group yaw is atan2(dx, dz)", () => {
    for (const [dx, dz] of [
      [1, 0],
      [0, 1],
      [-3, 4],
      [-2, -5],
      [7, -1],
    ]) {
      const f = crewForward(yawOf(dx, dz));
      const len = Math.hypot(dx, dz);
      expect(f.x).toBeCloseTo(dx / len, 6);
      expect(f.z).toBeCloseTo(dz / len, 6);
    }
  });

  it("turns the player model to its camera heading", () => {
    // Camera yaw y looks along (-sin y, -cos y).
    for (const yaw of [0, 0.65, -0.95, 2.4]) {
      const f = crewForward(playerGroupYaw(yaw));
      expect(f.x).toBeCloseTo(-Math.sin(yaw), 6);
      expect(f.z).toBeCloseTo(-Math.cos(yaw), 6);
    }
  });
});
