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

  it("supports all fleet units, accented Spanish verbs, and sanitized numeric coordinates", () => {
    const store = makeStoreWithFleet();
    const vc = new VoiceController(store);

    const cases: Array<{ text: string; lang: "en" | "es"; unitId: string; type: string; action?: string }> = [
      { text: "rover 2 come here", lang: "en", unitId: "rover-2", type: "dispatch" },
      { text: "drone 2 takeoff", lang: "en", unitId: "drone-2", type: "unit_action", action: "takeoff" },
      { text: "drone 2 land", lang: "en", unitId: "drone-2", type: "unit_action", action: "land" },
      { text: "glider 1 takeoff", lang: "en", unitId: "glider-1", type: "unit_action", action: "takeoff" },
      { text: "scout 1 follow", lang: "en", unitId: "scout-1", type: "unit_action", action: "follow_astronaut" },
      { text: "rover 1 ven", lang: "es", unitId: "rover-1", type: "dispatch" },
      { text: "drone 1 vení", lang: "es", unitId: "drone-1", type: "dispatch" },
      { text: "rescue 1 acércate", lang: "es", unitId: "rescue-1", type: "dispatch" },
      { text: "rescue 1 vuelve", lang: "es", unitId: "rescue-1", type: "unit_action", action: "return_to_base" },
      { text: "Base, manda al rover 2 a mi posicion", lang: "es", unitId: "rover-2", type: "dispatch" },
      { text: "rover-1 120, -40", lang: "en", unitId: "rover-1", type: "dispatch" },
    ];

    for (const item of cases) {
      setLang(item.lang);
      const res = vc.offlineFallback(item.text);
      expect(res.actions, item.text).toHaveLength(1);
      expect(res.actions[0].type, item.text).toBe(item.type);
      expect(res.actions[0].args.unit_id, item.text).toBe(item.unitId);
      expect(res.actions[0].verdict?.decision, item.text).toBe("allow");
      if (item.action) {
        expect(res.actions[0].args.action, item.text).toBe(item.action);
      }
      if (item.text === "Base, manda al rover 2 a mi posicion") {
        expect(
          Math.hypot(Number(res.actions[0].args.x) - store.astronaut.x, Number(res.actions[0].args.z) - store.astronaut.z),
        ).toBeLessThanOrEqual(5.5);
      }
      if (item.text === "rover-1 120, -40") {
        expect(res.actions[0].args.x).toBe(120);
        expect(res.actions[0].args.z).toBe(-40);
      }
    }
  });

  it("resolves slope-safe stand-off around steep astronaut positions and denies explicit steep hazards", () => {
    const store = makeStoreWithFleet();
    store.astronaut.x = 100;
    store.astronaut.z = 100;
    const slopeAt = (x: number, z: number) => {
      if (Math.hypot(x - 110, z - 100) <= 3) return 8;
      if (Math.hypot(x - 100, z - 100) <= 20) return 32;
      if (Math.hypot(x - 500, z - 500) <= 10) return 34;
      return 6;
    };
    const vc = new VoiceController(store, { slopeAt });

    const roverApproach = vc.offlineFallback("rover one, go to my position");
    expect(roverApproach.actions[0].type).toBe("dispatch");
    expect(roverApproach.actions[0].verdict?.decision).toBe("allow");
    expect(slopeAt(Number(roverApproach.actions[0].args.x), Number(roverApproach.actions[0].args.z))).toBeLessThanOrEqual(20);

    const droneApproach = vc.offlineFallback("drone one go to my position");
    expect(droneApproach.actions[0].verdict?.decision).toBe("allow");
    expect(droneApproach.actions[0].args.x).toBe(100);
    expect(droneApproach.actions[0].args.z).toBe(100);

    const explicitHazard = vc.offlineFallback("rover 1 go to 500, 500");
    expect(explicitHazard.actions[0].verdict?.decision).toBe("deny");
  });

  it("preserves existing thermal, route/s2, fan/trend, emergency, and hands/manip branches", () => {
    const store = makeStoreWithFleet();
    const vc = new VoiceController(store);

    const thermal = vc.offlineFallback("show thermal layer");
    expect(thermal.actions[0]).toMatchObject({ type: "set_layer", args: { layer: "thermal" } });

    const route = vc.offlineFallback("plan route to site two");
    expect(route.actions[0]).toMatchObject({ type: "show_route", args: { to_x: 180, to_z: 120 } });

    const fan = vc.offlineFallback("check fan trend");
    expect(store.fanDegraded).toBe(true);
    expect(fan.actions[0].type).toBe("show_alert");

    const emergency = vc.offlineFallback("emergency suit leak");
    expect(emergency.actions.map((a) => a.type)).toEqual(["launch_pod", "dispatch"]);
    expect(emergency.actions[0].verdict?.decision).toBe("ask_human");

    const hands = vc.offlineFallback("hands drill T1");
    expect(hands.actions[0]).toMatchObject({
      type: "arm_skill",
      args: { unit_id: "manip-1", skill: "drill", target_id: "T1" },
    });
  });
});
