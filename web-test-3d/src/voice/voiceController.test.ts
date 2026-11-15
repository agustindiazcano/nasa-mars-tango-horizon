import { beforeEach, describe, expect, it } from "vitest";
import { setLang } from "../core/i18n";
import { AIRCRAFT_GROUNDING_TAU } from "../core/physics";
import { MissionStore } from "../state";
import { VoiceController } from "./voiceController";

function makeStore(): MissionStore {
  const store = new MissionStore();
  store.astronaut.x = 28;
  store.astronaut.z = 36;
  store.astronaut.speed = 0;
  store.env.tau = 0.48;
  store.env.wind_ms = 5.2;
  store.env.pressure_pa = 748;
  store.env.air_temp_k = 234;
  store.fleet = [
    { id: "rover-1", kind: "rover_crew", x: -22, z: 18, battery: 0.94, busy: false, task: null },
    { id: "rover-2", kind: "rover_science", x: 62, z: 48, battery: 0.94, busy: false, task: null },
    { id: "rescue-1", kind: "rescue", x: -18, z: 12, battery: 0.94, busy: false, task: null },
    { id: "drone-1", kind: "drone", x: 40, z: -30, battery: 0.94, busy: false, task: null },
    { id: "drone-2", kind: "drone", x: -60, z: 55, battery: 0.94, busy: false, task: null },
    { id: "manip-1", kind: "manipulator", x: 34, z: 42, battery: 0.94, busy: false, task: null },
  ];
  return store;
}

describe("VoiceController.offlineFallback", () => {
  beforeEach(() => {
    setLang("en");
  });

  it("handles required English and Spanish fleet navigation orders with real actions and trace", () => {
    const store = makeStore();
    const vc = new VoiceController(store);

    const roverEn = vc.offlineFallback("rover one, go to my position");
    expect(roverEn.actions).toHaveLength(1);
    expect(roverEn.actions[0].type).toBe("dispatch");
    expect(roverEn.actions[0].args.unit_id).toBe("rover-1");
    expect(roverEn.actions[0].verdict?.decision).toBe("allow");
    expect(
      Math.hypot(Number(roverEn.actions[0].args.x) - store.astronaut.x, Number(roverEn.actions[0].args.z) - store.astronaut.z),
    ).toBeLessThanOrEqual(5.5);
    expect(roverEn.trace.some((ev) => ev.agent === "ROBOT.rover-1" && ev.kind === "tool")).toBe(true);
    expect(roverEn.trace.some((ev) => ev.agent === "GUARDIAN" && ev.kind === "verdict")).toBe(true);
    expect(roverEn.route).toEqual(["SUIT.VOICE-EXEC", "BASE", "ROBOT.rover-1"]);

    const droneEn = vc.offlineFallback("drone one go to my position");
    expect(droneEn.actions[0]).toMatchObject({
      type: "dispatch",
      args: { unit_id: "drone-1", x: 28, z: 36, task: "goto" },
      proposedBy: "ROBOT.drone-1",
    });
    expect(droneEn.actions[0].verdict?.decision).toBe("allow");

    setLang("es");
    const roverEs = vc.offlineFallback("rover 1 ven a mi posicion");
    expect(roverEs.actions[0].type).toBe("dispatch");
    expect(roverEs.actions[0].args.unit_id).toBe("rover-1");
    expect(roverEs.actions[0].verdict?.decision).toBe("allow");
    expect(
      Math.hypot(Number(roverEs.actions[0].args.x) - store.astronaut.x, Number(roverEs.actions[0].args.z) - store.astronaut.z),
    ).toBeLessThanOrEqual(5.5);

    setLang("en");
    const overwatch = vc.offlineFallback("drone 1 overwatch");
    expect(overwatch.actions[0]).toMatchObject({
      type: "unit_action",
      args: { unit_id: "drone-1", action: "hover_overwatch" },
      proposedBy: "ROBOT.drone-1",
    });
    expect(overwatch.actions[0].verdict?.decision).toBe("allow");

    const rescueRet = vc.offlineFallback("rescue 1 return");
    expect(rescueRet.actions.some((a) => a.type === "launch_pod")).toBe(false);
    expect(rescueRet.actions[0]).toMatchObject({
      type: "unit_action",
      args: { unit_id: "rescue-1", action: "return_to_base" },
      proposedBy: "ROBOT.rescue-1",
    });
    expect(rescueRet.actions[0].verdict?.decision).toBe("allow");
  });

  it("supports all fleet units and multilingual navigation verbs", () => {
    const store = makeStore();
    const vc = new VoiceController(store);

    const unitsAndOrders: Array<{ text: string; lang: "en" | "es"; unitId: string; type: string; action?: string }> = [
      { text: "rover 2 come here", lang: "en", unitId: "rover-2", type: "dispatch" },
      { text: "drone 2 takeoff", lang: "en", unitId: "drone-2", type: "unit_action", action: "takeoff" },
      { text: "drone 2 land", lang: "en", unitId: "drone-2", type: "unit_action", action: "land" },
      { text: "glider 1 takeoff", lang: "en", unitId: "glider-1", type: "unit_action", action: "takeoff" },
      { text: "scout 1 follow", lang: "en", unitId: "scout-1", type: "unit_action", action: "follow_astronaut" },
      { text: "manip 1 go to my position", lang: "en", unitId: "manip-1", type: "dispatch" },
      { text: "rover 1 ven", lang: "es", unitId: "rover-1", type: "dispatch" },
      { text: "drone 1 vení", lang: "es", unitId: "drone-1", type: "dispatch" },
      { text: "rescue 1 acércate", lang: "es", unitId: "rescue-1", type: "dispatch" },
      { text: "rover-1 120, -40", lang: "en", unitId: "rover-1", type: "dispatch" },
    ];

    for (const item of unitsAndOrders) {
      setLang(item.lang);
      const res = vc.offlineFallback(item.text);
      expect(res.actions, item.text).toHaveLength(1);
      expect(res.actions[0].type, item.text).toBe(item.type);
      expect(res.actions[0].args.unit_id, item.text).toBe(item.unitId);
      expect(res.actions[0].verdict?.decision, item.text).toBe("allow");
      if (item.action) {
        expect(res.actions[0].args.action, item.text).toBe(item.action);
      }
      if (item.text === "rover-1 120, -40") {
        expect(res.actions[0].args.x).toBe(120);
        expect(res.actions[0].args.z).toBe(-40);
      }
    }
  });

  it("enforces AIRCRAFT_GROUNDING_TAU (1.8) for flyers while allowing land and ground units", () => {
    const store = makeStore();
    store.env.tau = AIRCRAFT_GROUNDING_TAU;
    const vc = new VoiceController(store);

    const droneGoto = vc.offlineFallback("drone one go to my position");
    expect(droneGoto.actions[0].verdict?.decision).toBe("deny");
    expect(droneGoto.actions[0].verdict?.reason).toContain(String(AIRCRAFT_GROUNDING_TAU));

    const droneTakeoff = vc.offlineFallback("drone 1 takeoff");
    expect(droneTakeoff.actions[0].verdict?.decision).toBe("deny");

    const gliderOw = vc.offlineFallback("glider 1 overwatch");
    expect(gliderOw.actions[0].verdict?.decision).toBe("deny");

    const droneLand = vc.offlineFallback("drone 1 land");
    expect(droneLand.actions[0].verdict?.decision).toBe("allow");

    const roverGoto = vc.offlineFallback("rover one, go to my position");
    expect(roverGoto.actions[0].verdict?.decision).toBe("allow");
  });

  it("resolves slope-safe stand-off around steep astronaut positions and denies explicit steep hazards", () => {
    const store = makeStore();
    store.astronaut.x = 100;
    store.astronaut.z = 100;
    // Steep ridge near (100, 100) except east at +10 m (110, 100) where slope is 8 deg
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
    const rx = Number(roverApproach.actions[0].args.x);
    const rz = Number(roverApproach.actions[0].args.z);
    expect(slopeAt(rx, rz)).toBeLessThanOrEqual(20);

    // Flyers ignore ground slope
    const droneApproach = vc.offlineFallback("drone one go to my position");
    expect(droneApproach.actions[0].verdict?.decision).toBe("allow");
    expect(droneApproach.actions[0].args.x).toBe(100);
    expect(droneApproach.actions[0].args.z).toBe(100);

    // Explicit steep hazard away from astronaut is denied
    const explicitHazard = vc.offlineFallback("rover 1 go to 500, 500");
    expect(explicitHazard.actions[0].verdict?.decision).toBe("deny");
  });

  it("preserves existing thermal, route/s2, fan/trend, emergency, and hands/manip branches", () => {
    const store = makeStore();
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
