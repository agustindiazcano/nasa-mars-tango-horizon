import { describe, expect, it } from "vitest";
import { U1_DRONE_ARRIVE_S, U1_DRONE_ORDER_S, U1_WALK_FROM, U1_WALK_S, U1_WALK_TO, u1Drone, u1Gaze, u1Walker } from "../uiTourScript";

describe("U1 script", () => {
  it("walks from the start to the end and is deterministic", () => {
    expect(u1Walker(0)).toMatchObject({ x: U1_WALK_FROM.x, z: U1_WALK_FROM.z });
    const end = u1Walker(U1_WALK_S);
    expect(end.x).toBeCloseTo(U1_WALK_TO.x);
    expect(end.walking).toBe(false);
    expect(u1Walker(12)).toEqual(u1Walker(12));
  });

  it("gaze settles on each target without jumps", () => {
    const player = { x: 0, y: 0, z: 0 };
    const pos = (id: string) => (id === "crew-4" ? { x: 5, y: 0, z: 5 } : id === "rover-3" ? { x: 20, y: 0, z: 9 } : { x: 8, y: 14, z: -3 });
    let prev = u1Gaze(0, player, pos);
    for (let t = 0.1; t < 40; t += 0.1) {
      const g = u1Gaze(t, player, pos);
      expect(Math.hypot(g.x - prev.x, g.y - prev.y, g.z - prev.z)).toBeLessThan(25);
      prev = g;
    }
    expect(u1Gaze(20, player, pos).x).toBe(20);
  });

  it("drone leaves at the order and hovers near the player", () => {
    const start = { x: 40, z: -30 };
    const player = { x: 10, z: 30 };
    expect(u1Drone(U1_DRONE_ORDER_S - 1, start, player)).toMatchObject({ x: 40, flying: false });
    const arrived = u1Drone(U1_DRONE_ARRIVE_S + 1, start, player);
    expect(Math.hypot(arrived.x - player.x, arrived.z - player.z)).toBeLessThan(11);
    expect(arrived.altM).toBeCloseTo(9);
  });
});
