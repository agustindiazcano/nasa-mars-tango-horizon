import { afterEach, describe, expect, it } from "vitest";
import { setLang } from "../../core/i18n.js";
import { AIRCRAFT_GROUNDING_TAU } from "../../core/physics.js";
import type { UnitSnapshot } from "../../core/types.js";
import { MissionStore } from "../../state.js";
import { VoiceController } from "../voiceController.js";

function makeStoreWithFleet(tau = 0.48): MissionStore {
  const store = new MissionStore();
  store.env.tau = tau;
  const fleet: UnitSnapshot[] = [
    { id: "rover-1", kind: "rover_crew", x: -22, z: 18, battery: 0.94, busy: false, task: null },
    { id: "rover-2", kind: "rover_science", x: 62, z: 48, battery: 0.94, busy: false, task: null },
    { id: "rescue-1", kind: "rescue", x: -18, z: 12, battery: 0.94, busy: false, task: null },
    { id: "drone-1", kind: "drone", x: 40, z: -30, battery: 0.94, busy: false, task: null },
    { id: "drone-2", kind: "drone", x: -60, z: 55, battery: 0.94, busy: false, task: null },
    { id: "manip-1", kind: "manipulator", x: 34, z: 42, battery: 0.94, busy: false, task: null },
  ];
  store.fleet = fleet;
  return store;
}

describe("VoiceController.offlineFallback fleet navigation", () => {
  afterEach(() => {
    setLang("en");
  });

  it("dispatches rover-1 to a 5m stand-off around astronaut for 'rover one, go to my position'", () => {
    setLang("en");
    const store = makeStoreWithFleet();
    const vc = new VoiceController(store);

    const res = vc.offlineFallback("rover one, go to my position");

    expect(res.actions).toHaveLength(1);
    const act = res.actions[0];
    expect(act.type).toBe("dispatch");
    expect(act.args.unit_id).toBe("rover-1");
    expect(act.args.task).toBe("goto");
    expect(act.verdict?.decision).toBe("allow");

    const distToAstro = Math.hypot(
      Number(act.args.x) - store.astronaut.x,
      Number(act.args.z) - store.astronaut.z,
    );
    expect(distToAstro).toBeGreaterThanOrEqual(4.5);
    expect(distToAstro).toBeLessThanOrEqual(5.5);

    expect(res.route).toEqual(["SUIT.VOICE-EXEC", "BASE", "ROBOT.rover-1"]);
    expect(res.trace.map((e) => e.agent)).toEqual([
      "SUIT.VOICE-EXEC",
      "BASE",
      "ROBOT.rover-1",
      "GUARDIAN",
    ]);
  });

  it("dispatches drone-1 directly to astronaut coordinates for 'drone one go to my position'", () => {
    setLang("en");
    const store = makeStoreWithFleet();
    const vc = new VoiceController(store);

    const res = vc.offlineFallback("drone one go to my position");

    expect(res.actions).toHaveLength(1);
    const act = res.actions[0];
    expect(act.type).toBe("dispatch");
    expect(act.args).toEqual({
      unit_id: "drone-1",
      x: store.astronaut.x,
      z: store.astronaut.z,
      task: "goto",
    });
    expect(act.verdict?.decision).toBe("allow");
    expect(res.route).toEqual(["SUIT.VOICE-EXEC", "BASE", "ROBOT.drone-1"]);
    expect(res.speech.toLowerCase()).toContain("14 m");
  });

  it("handles Spanish 'rover 1 ven a mi posicion' and 'drone veni'", () => {
    setLang("es");
    const store = makeStoreWithFleet();
    const vc = new VoiceController(store);

    const roverRes = vc.offlineFallback("rover 1 ven a mi posicion");
    expect(roverRes.actions).toHaveLength(1);
    expect(roverRes.actions[0].type).toBe("dispatch");
    expect(roverRes.actions[0].args.unit_id).toBe("rover-1");
    expect(roverRes.actions[0].verdict?.decision).toBe("allow");
    const roverDist = Math.hypot(
      Number(roverRes.actions[0].args.x) - store.astronaut.x,
      Number(roverRes.actions[0].args.z) - store.astronaut.z,
    );
    expect(roverDist).toBeGreaterThanOrEqual(4.5);
    expect(roverDist).toBeLessThanOrEqual(5.5);

    const droneRes = vc.offlineFallback("drone veni");
    expect(droneRes.actions).toHaveLength(1);
    expect(droneRes.actions[0].type).toBe("dispatch");
    expect(droneRes.actions[0].args.unit_id).toBe("drone-1");
    expect(droneRes.actions[0].args.x).toBe(store.astronaut.x);
    expect(droneRes.actions[0].args.z).toBe(store.astronaut.z);
    expect(droneRes.actions[0].verdict?.decision).toBe("allow");
  });

  it("executes unit actions for follow, overwatch, takeoff, land, return, rescue, and manip", () => {
    setLang("en");
    const store = makeStoreWithFleet();
    const vc = new VoiceController(store);

    const follow = vc.offlineFallback("rover 1 follow me");
    expect(follow.actions[0]).toMatchObject({
      type: "unit_action",
      args: { unit_id: "rover-1", action: "follow_astronaut" },
      verdict: { decision: "allow" },
    });

    const overwatch = vc.offlineFallback("drone 1 overwatch");
    expect(overwatch.actions[0]).toMatchObject({
      type: "unit_action",
      args: { unit_id: "drone-1", action: "hover_overwatch" },
      verdict: { decision: "allow" },
    });

    const takeoff = vc.offlineFallback("drone 1 takeoff");
    expect(takeoff.actions[0]).toMatchObject({
      type: "unit_action",
      args: { unit_id: "drone-1", action: "takeoff", altitude_m: 14 },
      verdict: { decision: "allow" },
    });

    const land = vc.offlineFallback("drone 1 land");
    expect(land.actions[0]).toMatchObject({
      type: "unit_action",
      args: { unit_id: "drone-1", action: "land" },
      verdict: { decision: "allow" },
    });

    const rtb = vc.offlineFallback("rover 1 return to base");
    expect(rtb.actions[0]).toMatchObject({
      type: "unit_action",
      args: { unit_id: "rover-1", action: "return_to_base" },
      verdict: { decision: "allow" },
    });

    const rescueGo = vc.offlineFallback("rescue 1 go to my position");
    expect(rescueGo.actions[0]).toMatchObject({
      type: "dispatch",
      args: { unit_id: "rescue-1", task: "goto" },
      verdict: { decision: "allow" },
    });

    const manipGo = vc.offlineFallback("manip 1 go to my position");
    expect(manipGo.actions[0]).toMatchObject({
      type: "dispatch",
      args: { unit_id: "manip-1", task: "goto" },
      verdict: { decision: "allow" },
    });
  });

  it("enforces aircraft dust grounding above AIRCRAFT_GROUNDING_TAU while still allowing land and rejecting rover takeoff", () => {
    setLang("en");
    const store = makeStoreWithFleet(AIRCRAFT_GROUNDING_TAU + 0.1);
    const vc = new VoiceController(store);

    const droneDispatch = vc.offlineFallback("drone one go to my position");
    expect(droneDispatch.actions[0].verdict?.decision).toBe("deny");
    expect(droneDispatch.actions[0].verdict?.reason).toContain("aircraft grounding limit");

    const droneOverwatch = vc.offlineFallback("drone 1 overwatch");
    expect(droneOverwatch.actions[0].verdict?.decision).toBe("deny");

    const droneTakeoff = vc.offlineFallback("drone 1 takeoff");
    expect(droneTakeoff.actions[0].verdict?.decision).toBe("deny");

    const droneLand = vc.offlineFallback("drone 1 land");
    expect(droneLand.actions[0].verdict?.decision).toBe("allow");

    const roverTakeoff = vc.offlineFallback("rover 1 takeoff");
    expect(roverTakeoff.actions[0].verdict?.decision).toBe("deny");
  });
});
