import { describe, expect, it } from "vitest";
import { AIRCRAFT_GROUNDING_TAU, RESCUE_PIT, RESCUE_SITE } from "@th/shared";
import {
  DRONE_GROUNDING_T_S,
  DRONE_ORBIT_RADIUS_M,
  DRONE_STANDOFF_M,
  RESCUE_TICK_S,
  RescueScenario,
  rescueEventIds,
  rescueTauAt,
} from "../rescueScenario";

const IDS = [
  "base",
  "compute",
  "crew-1",
  "crew-2",
  "crew-3",
  "crew-4",
  "rover-1",
  "rover-2",
  "rover-3",
  "rescue-1",
  "rescue-bot-1",
  "drone-1",
  "drone-2",
  "pit",
  "rescue-site",
] as const;

const flat = (_x: number, _z: number) => 100;
const make = () => new RescueScenario({ heightAt: flat });

function snapshot(s: RescueScenario): string {
  return JSON.stringify(IDS.map((id) => s.getEntityPosition(id)?.toArray()));
}

describe("RescueScenario", () => {
  it("exposes the planned API and starts idle", () => {
    const s = make();
    expect(s.durationS).toBe(180);
    expect(s.elapsedS).toBe(0);
    expect(s.running).toBe(false);
    expect(s.events).toEqual([]);
    for (const id of IDS) expect(s.getEntityPosition(id), id).not.toBeNull();
    expect(s.getEntityPosition("nope")).toBeNull();
  });

  it("advances only while running and supports pause and resume", () => {
    const s = make();
    s.step(1);
    expect(s.elapsedS).toBe(0);
    s.start();
    s.step(1);
    expect(s.elapsedS).toBeCloseTo(1, 6);
    s.pause();
    s.step(5);
    expect(s.elapsedS).toBeCloseTo(1, 6);
    s.resume();
    s.step(0.5);
    expect(s.elapsedS).toBeCloseTo(1.5, 6);
    s.reset();
    expect(s.elapsedS).toBe(0);
    expect(s.running).toBe(false);
    expect(s.events).toEqual([]);
  });

  it("is deterministic: seekTo(t) equals stepping to t, whatever the step size", () => {
    const stepped = make();
    stepped.start();
    for (let i = 0; i < 1000; i++) stepped.step(0.1);
    const fine = make();
    fine.start();
    for (let i = 0; i < 3000; i++) fine.step(RESCUE_TICK_S);
    const seeked = make();
    seeked.seekTo(100);
    expect(stepped.elapsedS).toBeCloseTo(100, 6);
    expect(snapshot(seeked)).toBe(snapshot(stepped));
    expect(snapshot(seeked)).toBe(snapshot(fine));
    const again = snapshot(seeked);
    seeked.seekTo(30);
    seeked.seekTo(100);
    expect(snapshot(seeked)).toBe(again);
    expect(seeked.events.map((e) => e.id)).toEqual(stepped.events.map((e) => e.id));
  });

  it("fires the scripted events in order with localized text and stops at 180 s", () => {
    const fired: string[] = [];
    const s = new RescueScenario({ heightAt: flat, onEvent: (e) => fired.push(e.id) });
    s.start();
    for (let i = 0; i < 1900; i++) s.step(0.1);
    expect(s.elapsedS).toBe(180);
    expect(s.running).toBe(false);
    expect(fired).toEqual(rescueEventIds());
    const byId = Object.fromEntries(s.events.map((e) => [e.id, e]));
    expect(byId.rover_fault.tS).toBe(50);
    expect(byId.crew3_fall.tS).toBe(55);
    expect(byId.storm_onset.tS).toBe(60);
    expect(byId.drones_launch.tS).toBe(68);
    expect(byId.drones_grounded.tS).toBeCloseTo(DRONE_GROUNDING_T_S, 6);
    for (const e of s.events) {
      expect(e.text.length).toBeGreaterThan(5);
      expect(e.text.startsWith("rescue.ev.")).toBe(false);
    }
  });

  it("does not replay onEvent callbacks during seekTo", () => {
    const fired: string[] = [];
    const s = new RescueScenario({ heightAt: flat, onEvent: (e) => fired.push(e.id) });
    s.seekTo(120);
    expect(fired).toEqual([]);
    expect(s.events.length).toBeGreaterThan(5);
  });

  it("ties drone grounding to the tau limit of 1.8", () => {
    expect(rescueTauAt(60)).toBeLessThan(AIRCRAFT_GROUNDING_TAU);
    expect(rescueTauAt(DRONE_GROUNDING_T_S)).toBeGreaterThanOrEqual(AIRCRAFT_GROUNDING_TAU);
    expect(rescueTauAt(DRONE_GROUNDING_T_S - RESCUE_TICK_S)).toBeLessThan(AIRCRAFT_GROUNDING_TAU);
    const s = make();
    s.seekTo(DRONE_GROUNDING_T_S - 1);
    expect(s.view.dronesGrounded).toBe(false);
    s.seekTo(DRONE_GROUNDING_T_S + 6);
    expect(s.view.dronesGrounded).toBe(true);
    expect(s.getEntityPosition("drone-1")!.y).toBeCloseTo(100.35, 1);
  });

  it("launches the drones at 68 s", () => {
    const s = make();
    s.seekTo(67);
    const before = s.getEntityPosition("drone-1")!.clone();
    s.seekTo(80);
    const after = s.getEntityPosition("drone-1")!;
    expect(after.distanceTo(before)).toBeGreaterThan(10);
    s.seekTo(10);
    expect(s.getEntityPosition("drone-1")!.distanceTo(before)).toBeLessThan(1e-6);
  });

  it("keeps drones at least 25 m from every crew member and at 20-30 m altitude on station", () => {
    const s = make();
    const crewIds = ["crew-1", "crew-2", "crew-3", "crew-4"] as const;
    for (let t = 68; t <= 180; t += 0.5) {
      s.seekTo(t);
      for (const d of ["drone-1", "drone-2"] as const) {
        const dp = s.getEntityPosition(d)!;
        for (const c of crewIds) {
          const cp = s.getEntityPosition(c)!;
          expect(Math.hypot(dp.x - cp.x, dp.z - cp.z), `${d} vs ${c} at t=${t}`).toBeGreaterThanOrEqual(DRONE_STANDOFF_M);
        }
        if (t >= 104 && t < DRONE_GROUNDING_T_S) {
          const alt = dp.y - 100;
          expect(alt).toBeGreaterThanOrEqual(20);
          expect(alt).toBeLessThanOrEqual(30);
          expect(Math.hypot(dp.x - RESCUE_SITE.x, dp.z - RESCUE_SITE.z)).toBeCloseTo(DRONE_ORBIT_RADIUS_M, 3);
        }
      }
    }
  });

  it("puts the drones on opposite sides of the target", () => {
    const s = make();
    s.seekTo(110);
    const a = s.getEntityPosition("drone-1")!;
    const b = s.getEntityPosition("drone-2")!;
    const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    expect(Math.hypot(mid.x - RESCUE_SITE.x, mid.z - RESCUE_SITE.z)).toBeLessThan(1);
  });

  it("drops DIAZ-CANO into the pit and leaves him lying on the floor until he is loaded", () => {
    const s = make();
    s.seekTo(40);
    expect(s.getEntityPosition("crew-3")!.y).toBeCloseTo(100, 6);
    s.seekTo(100);
    const inPit = s.getEntityPosition("crew-3")!;
    expect(inPit.y).toBeGreaterThan(100 - RESCUE_PIT.depthM);
    expect(inPit.y).toBeLessThan(100 - RESCUE_PIT.depthM + 0.3);
    expect(Math.hypot(inPit.x - RESCUE_SITE.x, inPit.z - RESCUE_SITE.z)).toBeLessThan(RESCUE_PIT.radiusM);
    const v = s.view.crew["crew-3"];
    expect(v).toMatchObject({ pose: "lying", inPit: true, location: "in_pit", status: "incapacitated", visible: true });
    for (const t of [56, 70, 110, 140]) {
      s.seekTo(t);
      expect(s.view.crew["crew-3"].pose, `t=${t}`).toBe("lying");
    }
  });

  it("rolls the robot out of the bay, down the ramp, and stops next to the casualty", () => {
    const s = make();
    s.seekTo(135);
    const r = s.getEntityPosition("rescue-1")!;
    expect(Math.hypot(r.x - RESCUE_SITE.x, r.z - RESCUE_SITE.z)).toBeGreaterThan(15);
    expect(s.view.robot.stowed).toBe(false);
    expect(s.view.units["rescue-bot-1"].yOffset ?? 0).toBeCloseTo(0, 6);
    s.seekTo(139);
    const onRamp = s.view.units["rescue-bot-1"];
    expect(onRamp.yOffset!).toBeLessThan(-0.5);
    expect(onRamp.pitch!).toBeLessThan(-0.3);
    s.seekTo(143);
    const bot = s.getEntityPosition("rescue-bot-1")!;
    const cas = s.getEntityPosition("crew-3")!;
    expect(Math.hypot(bot.x - cas.x, bot.z - cas.z)).toBeCloseTo(1.85, 2);
    expect(bot.y).toBeLessThan(100 - 2.5);
    expect(s.view.robot.skill).toBe("descend");
    s.seekTo(147);
    expect(s.view.robot.skill).toBe("secure");
  });

  it("drags him on the ground up the ramp, and hides him only once he passes the bay threshold", () => {
    const s = make();
    let hiddenAt: number | null = null;
    let prevY = -Infinity;
    for (let t = 150; t <= 174; t += 0.25) {
      s.seekTo(t);
      const c = s.view.crew["crew-3"];
      if (c.visible) {
        const p = s.getEntityPosition("crew-3")!;
        expect(c.pose).toBe("lying");
        expect(c.status).toBe("evacuating");
        expect(p.y - 100).toBeLessThan(0.6);
        if (t >= 152) expect(p.y).toBeGreaterThanOrEqual(prevY - 1e-6);
        prevY = p.y;
      } else if (hiddenAt === null) {
        hiddenAt = t;
        expect(c.location).toBe("rescue_vehicle");
        expect(c.unit_id).toBe("rescue-1");
      }
    }
    expect(hiddenAt).not.toBeNull();
    expect(hiddenAt!).toBeGreaterThan(160);
    expect(hiddenAt!).toBeLessThanOrEqual(168.25);
    // The robot is in the bay when he is loaded; the ramp closes afterwards.
    s.seekTo(169);
    expect(s.view.rampOpen01).toBe(1);
    s.seekTo(173);
    expect(s.view.rampOpen01).toBe(0);
    expect(s.view.robot.stowed).toBe(true);
  });

  it("is deterministic across the whole choreography", () => {
    const seeked = make();
    const stepped = make();
    stepped.start();
    for (let t = 1; t <= 175; t += 6.5) {
      while (stepped.elapsedS < t - 1e-9) stepped.step(0.5);
      seeked.seekTo(stepped.elapsedS);
      expect(snapshot(seeked), `t=${stepped.elapsedS}`).toBe(snapshot(stepped));
      expect(JSON.stringify(seeked.view)).toBe(JSON.stringify(stepped.view));
    }
  });

  it("boards SALERNO and ends with rescue-1 departing with both aboard", () => {
    const s = make();
    s.seekTo(178);
    expect(s.view.crew["crew-3"].location).toBe("rescue_vehicle");
    expect(s.view.crew["crew-2"].location).toBe("rescue_vehicle");
  });

  it("drives the storm tau up from 60 s", () => {
    const s = make();
    s.seekTo(59);
    const nominal = s.view.tau;
    s.seekTo(150);
    expect(s.view.tau).toBeGreaterThan(nominal + 2);
    s.seekTo(180);
    expect(s.view.tau).toBeCloseTo(6, 6);
  });

  it("reports the four callsigns with location and status, and accepts names as entity ids", () => {
    const s = make();
    const idle = s.getCrewSnapshots();
    expect(idle.map((c) => c.name)).toEqual(["SOTELO", "YACONIS", "SALERNO", "DIAZ-CANO"]);
    expect(idle.find((c) => c.name === "DIAZ-CANO")).toMatchObject({ location: "in_rover", unit_id: "rover-1", status: "nominal" });
    s.seekTo(100);
    const snaps = s.getCrewSnapshots();
    const diazcano = snaps.find((c) => c.name === "DIAZ-CANO")!;
    expect(diazcano).toMatchObject({ id: "crew-3", location: "in_pit", status: "incapacitated" });
    expect(snaps.find((c) => c.name === "SALERNO")).toMatchObject({ location: "traverse", status: "nominal" });
    expect(snaps.find((c) => c.name === "YACONIS")).toMatchObject({ location: "base", assignment: "base" });
    expect(s.getEntityPosition("DIAZ-CANO")!.toArray()).toEqual(s.getEntityPosition("crew-3")!.toArray());
    expect(s.getEntityPosition("Salerno")).not.toBeNull();
    s.seekTo(160);
    expect(s.getCrewSnapshots().find((c) => c.name === "DIAZ-CANO")).toMatchObject({ location: "traverse", status: "evacuating" });
    s.seekTo(178);
    expect(s.getCrewSnapshots().find((c) => c.name === "DIAZ-CANO")).toMatchObject({ location: "rescue_vehicle", unit_id: "rescue-1" });
  });

  it("uses callsigns in event texts", () => {
    const s = make();
    s.seekTo(60);
    const fall = s.events.find((e) => e.id === "crew3_fall")!;
    expect(fall.text).toContain("DIAZ-CANO");
    expect(fall.text).not.toContain("crew-3");
  });
});
