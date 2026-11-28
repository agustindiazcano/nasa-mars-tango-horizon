import { describe, expect, it } from "vitest";
import { PUFFS_PER_M, puffCount } from "../vehicleDust";

describe("vehicle dust emission", () => {
  it("emits in proportion to the distance and carries the remainder", () => {
    let carry = 0;
    let total = 0;
    for (let i = 0; i < 100; i++) {
      const r = puffCount(0.3, carry);
      carry = r.carry;
      total += r.n;
    }
    expect(total).toBe(Math.floor(30 * PUFFS_PER_M));
    expect(carry).toBeGreaterThanOrEqual(0);
    expect(carry).toBeLessThan(1);
  });

  it("emits nothing for no movement", () => {
    expect(puffCount(0, 0).n).toBe(0);
  });
});
