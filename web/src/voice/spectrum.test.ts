import { describe, expect, it } from "vitest";
import { barHeight } from "./spectrum";

describe("barHeight", () => {
  it("returns the idle floor for silence", () => {
    expect(barHeight(0, 28)).toBe(2);
  });
  it("returns the full height for the max value", () => {
    expect(barHeight(255, 28)).toBe(28);
  });
  it("clamps out-of-range input", () => {
    expect(barHeight(999, 28)).toBe(28);
    expect(barHeight(-5, 28)).toBe(2);
  });
});
