import { describe, expect, it } from "vitest";
import {
  buildRescueRobotModel,
  RESCUE_SKILL_DURATION_S,
  RescueSkillRunner,
  rescuePoseFor,
} from "../rescueRobotProc";

describe("rescue robot skills", () => {
  it("pays the tether out to the pit floor on descend and recovers it on winch", () => {
    const depth = 4;
    expect(rescuePoseFor("descend", 0, depth).winchM).toBeLessThan(0.5);
    expect(rescuePoseFor("descend", 1, depth).winchM).toBeGreaterThanOrEqual(depth);
    expect(rescuePoseFor("secure", 1, depth).stretcher).toBe("loaded");
    expect(rescuePoseFor("winch", 0, depth).winchM).toBeGreaterThanOrEqual(depth);
    expect(rescuePoseFor("winch", 1, depth).winchM).toBeLessThan(1);
  });

  it("builds a model whose tether and stretcher follow the pose", () => {
    const model = buildRescueRobotModel();
    model.applyPose(rescuePoseFor("descend", 1, 4));
    const deep = model.hook.position.y;
    model.applyPose(rescuePoseFor("winch", 1, 4));
    expect(model.hook.position.y).toBeGreaterThan(deep);
  });

  it("runs a skill to completion and emits one done event", () => {
    const events: string[] = [];
    const runner = new RescueSkillRunner(buildRescueRobotModel(), 4, (ev) => events.push(ev));
    runner.start("secure");
    for (let i = 0; i < RESCUE_SKILL_DURATION_S.secure * 10 + 5; i++) runner.update(0.1);
    expect(events).toEqual(["secure_done"]);
    expect(runner.active).toBeNull();
  });
});
