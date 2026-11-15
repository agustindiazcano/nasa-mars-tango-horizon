import { describe, expect, it } from "vitest";
import {
  buildRescueRobotModel,
  RESCUE_SKILL_DURATION_S,
  RescueSkillRunner,
  rescuePoseFor,
} from "../rescueRobotProc";

describe("rescue robot skills", () => {
  it("lowers the arm to the casualty, hooks the harness and raises it for the drag", () => {
    expect(rescuePoseFor("descend", 0).armPitch).toBeLessThan(rescuePoseFor("descend", 1).armPitch);
    expect(rescuePoseFor("secure", 1).stretcher).toBe("loaded");
    expect(rescuePoseFor("winch", 0).armPitch).toBeGreaterThan(rescuePoseFor("winch", 1).armPitch);
    expect(rescuePoseFor("winch", 1).stretcher).toBe("loaded");
  });

  it("builds a model whose harness hook follows the pose and stays above the ground", () => {
    const model = buildRescueRobotModel();
    model.applyPose(rescuePoseFor("secure", 1));
    const reach = model.hook.position.y;
    expect(reach).toBeGreaterThan(0.05);
    expect(reach).toBeLessThan(0.4);
    model.applyPose(rescuePoseFor("winch", 1));
    expect(model.hook.position.y).toBeGreaterThan(reach - 0.05);
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
