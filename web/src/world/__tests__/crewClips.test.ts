import { describe, expect, it } from "vitest";
import { clipForState, poseForSpeed, RUN_SPEED_MS } from "../crewProc";

describe("crew clip state machine", () => {
  it("maps poses to clips", () => {
    expect(clipForState("idle", null)).toBe("Idle_11");
    expect(clipForState("walk", "Idle_11")).toBe("Walking");
    expect(clipForState("run", "Walking")).toBe("Running");
  });

  it("falls once and then stays lying", () => {
    expect(clipForState("lying", "Walking")).toBe("Fall_Dead_from_Abdominal_Injury");
    expect(clipForState("lying", "Fall_Dead_from_Abdominal_Injury")).toBe("Fall_Dead_from_Abdominal_Injury");
    expect(clipForState("lying", "Dead")).toBe("Dead");
  });

  it("selects locomotion from ground speed", () => {
    expect(poseForSpeed(0)).toBe("idle");
    expect(poseForSpeed(2.4)).toBe("walk");
    expect(poseForSpeed(RUN_SPEED_MS + 0.5)).toBe("run");
  });
});
