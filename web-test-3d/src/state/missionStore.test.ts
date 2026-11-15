import { beforeEach, describe, expect, it, vi } from "vitest";
import { ASTRONAUT_START, READY_TERRAIN } from "@th/shared";
import { setLang } from "../core/i18n";
import type { Action, RouteDisplay } from "../core/types";
import { MissionStore, type WorldHooks } from "../state";

describe("MissionStore (web-test-3d)", () => {
  beforeEach(() => {
    setLang("en");
  });

  it("executes allowed actions through hooks and updates HUD state", () => {
    const store = new MissionStore();
    const routeOut: RouteDisplay = {
      points: [
        { x: 0, z: 0 },
        { x: 180, z: 120 },
      ],
      distanceM: 216.3,
      timeS: 120,
      o2Kg: 0.045,
      meanSvf: 0.91,
      algorithm: "A*",
    };
    const hooks: WorldHooks = {
      onLayerChange: vi.fn(),
      onShowRoute: vi.fn(() => routeOut),
      onDispatch: vi.fn(),
      onLaunchPod: vi.fn(),
      onDeployBeacons: vi.fn(),
      onArmSkill: vi.fn(),
      onUnitAction: vi.fn(),
      onStopAll: vi.fn(),
    };
    store.setHooks(hooks);

    const actions: Action[] = [
      {
        type: "set_layer",
        args: { layer: "hydration" },
        proposedBy: "SCIENCE",
        verdict: { decision: "allow", reason: "UI action", by: "rules" },
      },
      {
        type: "open_panel",
        args: { panel: "fleet" },
        proposedBy: "BASE",
        verdict: { decision: "allow", reason: "UI action", by: "rules" },
      },
      {
        type: "show_route",
        args: { to_x: 180, to_z: 120 },
        proposedBy: "EVA-PLANNER",
        verdict: { decision: "allow", reason: "UI action", by: "rules" },
      },
      {
        type: "dispatch",
        args: { unit_id: "rover-1", x: 100, z: -50, task: "scout" },
        proposedBy: "BASE",
        verdict: { decision: "allow", reason: "Within slope limit", by: "rules" },
      },
      {
        type: "launch_pod",
        args: { target_x: 60, target_z: 40, payload: "o2_resupply" },
        proposedBy: "BASE",
        verdict: { decision: "allow", reason: "Safe keep-out", by: "judge" },
      },
      {
        type: "deploy_beacons",
        args: { beacons: [{ id: "B1", x: 10, z: 20 }], mode: "ballistic_canister" },
        proposedBy: "EVA-PLANNER",
        verdict: { decision: "allow", reason: "Non-pyrotechnic", by: "judge" },
      },
      {
        type: "arm_skill",
        args: { skill: "sample", target_id: "T2", item: "core" },
        proposedBy: "ROBOT.manip-1",
        verdict: { decision: "allow", reason: "Clear of crew", by: "rules" },
      },
      {
        type: "unit_action",
        args: { unit_id: "drone-1", action: "takeoff" },
        proposedBy: "BASE",
        verdict: { decision: "allow", reason: "Weather clear", by: "rules" },
      },
      {
        type: "stop_all",
        args: {},
        proposedBy: "LOCAL",
      },
    ];

    store.applyActions(actions);

    expect(store.layer).toBe("hydration");
    expect(store.panel).toBe("fleet");
    expect(store.activeRoute).toEqual(routeOut);
    expect(hooks.onLayerChange).toHaveBeenCalledWith("hydration");
    expect(hooks.onShowRoute).toHaveBeenCalledWith(180, 120);
    expect(hooks.onDispatch).toHaveBeenCalledWith("rover-1", 100, -50, "scout");
    expect(hooks.onLaunchPod).toHaveBeenCalledWith(60, 40, "o2_resupply");
    expect(hooks.onDeployBeacons).toHaveBeenCalledWith([{ id: "B1", x: 10, z: 20 }], "ballistic_canister");
    expect(hooks.onArmSkill).toHaveBeenCalledWith("sample", "T2", "core");
    expect(hooks.onUnitAction).toHaveBeenCalledWith("drone-1", "takeoff", { unit_id: "drone-1", action: "takeoff" });
    expect(hooks.onStopAll).toHaveBeenCalledTimes(1);
    expect(store.alerts.some((a) => a.text.includes("Route (A*)"))).toBe(true);
  });

  it("blocks denied actions and emits GUARDIAN warning alerts", () => {
    const store = new MissionStore();
    const onDispatch = vi.fn();
    store.setHooks({ onDispatch });

    store.applyActions([
      {
        type: "dispatch",
        args: { unit_id: "rover-1", x: 500, z: 500, task: "goto" },
        proposedBy: "BASE",
        verdict: { decision: "deny", reason: "26° slope exceeds 20° limit", by: "rules" },
      },
    ]);

    expect(onDispatch).not.toHaveBeenCalled();
    expect(store.pendingActions).toHaveLength(0);
    expect(store.alerts[0]).toMatchObject({
      level: "warn",
      source: "GUARDIAN",
    });
    expect(store.alerts[0].text).toContain("GUARDIAN DENIED dispatch");
  });

  it("queues ask_human actions and handles confirm/cancel lifecycle", () => {
    const store = new MissionStore();
    const onDispatch = vi.fn();
    const onLaunchPod = vi.fn();
    store.setHooks({ onDispatch, onLaunchPod });

    store.applyActions([
      {
        type: "dispatch",
        args: { unit_id: "rover-1", x: 300, z: 100, task: "goto" },
        proposedBy: "BASE",
        verdict: { decision: "ask_human", reason: "Elevated SEP radiation", by: "rules" },
      },
      {
        type: "launch_pod",
        args: { target_x: 120, target_z: 80, payload: "o2_resupply" },
        proposedBy: "BASE",
        verdict: { decision: "ask_human", reason: "Borderline wind drift", by: "judge" },
      },
    ]);

    expect(onDispatch).not.toHaveBeenCalled();
    expect(onLaunchPod).not.toHaveBeenCalled();
    expect(store.pendingActions).toHaveLength(2);
    expect(store.alerts[0].text).toContain("Confirm required: launch_pod");

    const dispatchIdx = store.findPendingActionIndex("dispatch");
    expect(dispatchIdx).toBe(0);
    store.confirmPendingAction(dispatchIdx, true);
    expect(onDispatch).toHaveBeenCalledWith("rover-1", 300, 100, "goto");
    expect(store.pendingActions).toHaveLength(1);
    expect(store.alerts[0].text).toBe("Crew confirmed: dispatch");

    const podIdx = store.findPendingActionIndex("launch_pod");
    expect(podIdx).toBe(0);
    store.confirmPendingAction(podIdx, false);
    expect(onLaunchPod).not.toHaveBeenCalled();
    expect(store.pendingActions).toHaveLength(0);
    expect(store.alerts[0].text).toBe("Crew cancelled: launch_pod");
    expect(store.findPendingActionIndex("launch_pod")).toBe(-1);

    // Out-of-bounds index safely does nothing.
    const alertCount = store.alerts.length;
    store.confirmPendingAction(99, true);
    expect(store.alerts).toHaveLength(alertCount);
  });

  it("bounds and formats toContext() snapshot fields accurately", () => {
    const store = new MissionStore();
    setLang("es");
    store.terrain = READY_TERRAIN;
    store.metS = 1420.6;
    store.astronaut.x = 12.3456;
    store.astronaut.z = -98.7654;
    store.astronaut.speed = 1.2345;
    store.astronaut.load_kg = 65.129;
    store.suit.o2_primary_kg = 1.08496;
    store.suit.battery_wh = 739.96;
    store.env.pressure_pa = 748.4;
    store.env.air_temp_k = 234.56;
    store.env.tau = 1.236;
    store.env.dose_rate_ugy_h = 12.349;
    store.fleet = [
      { id: "rover-1", kind: "rover_crew", x: 10.16, z: -20.24, battery: 0.87654, busy: true, task: "scout" },
    ];
    store.leakDiameterM = 0.0016;
    store.emergencyResponseActive = true;

    const ctxNone = store.toContext();
    expect(ctxNone.terrain).toEqual(READY_TERRAIN);
    expect(ctxNone.lang).toBe("es-AR");
    expect(ctxNone.met_s).toBe(1421);
    expect(ctxNone.astronaut).toEqual({
      x: 12.35,
      z: -98.77,
      speed: 1.23,
      load_kg: 65.13,
      body_kg: 78,
    });
    expect(ctxNone.suit.o2_primary_kg).toBe(1.085);
    expect(ctxNone.suit.battery_wh).toBe(740);
    expect(ctxNone.env.pressure_pa).toBe(748);
    expect(ctxNone.env.air_temp_k).toBe(234.6);
    expect(ctxNone.env.tau).toBe(1.24);
    expect(ctxNone.env.dose_rate_ugy_h).toBe(12.35);
    expect(ctxNone.fleet).toEqual([
      { id: "rover-1", kind: "rover_crew", x: 10.2, z: -20.2, battery: 0.877, busy: true },
    ]);
    expect(ctxNone.hud).toEqual({ layer: "optical", panel: null });
    expect(ctxNone.leak_diameter_m).toBe(0.0016);
    expect(ctxNone.emergency_response_active).toBe(true);

    store.setPanel("agents");
    expect(store.toContext().hud.panel).toBe("agents");
  });

  it("resets simulation state and triggers onReset and subscribe listeners", () => {
    const store = new MissionStore();
    const resetSpy = vi.fn();
    const subSpy = vi.fn();
    const unsubReset = store.onReset(resetSpy);
    const unsubSub = store.subscribe(subSpy);

    store.metS = 5000;
    store.simScale = 10;
    store.layer = "radiation";
    store.panel = "health";
    store.leakDiameterM = 0.002;
    store.emergencyResponseActive = true;
    store.activeScenario = "storm";
    store.astronaut.x = 400;
    store.suit.o2_primary_kg = 0.2;
    store.env.tau = 4.2;
    store.pushAlert("crit", "Test alert");
    store.pushTranscript("you", "Base, status", true);
    store.setTrace([{ t: 1, agent: "BASE", kind: "say", detail: "ok" }], ["BASE"]);
    store.pendingActions.push({ type: "launch_pod", args: {}, proposedBy: "BASE" });
    store.samples.push({ id: "S1", label: "Rock", x: 1, z: 2, met_s: 1500, mass_kg: 0.5, hydration_index: 4.1 });
    store.roverPreviewUrl = "data:image/png;base64,AA==";
    store.lastDrillDepthCm = 5.5;

    store.reset();

    expect(store.metS).toBe(1420);
    expect(store.simScale).toBe(1);
    expect(store.layer).toBe("optical");
    expect(store.panel).toBe("none");
    expect(store.leakDiameterM).toBe(0);
    expect(store.emergencyResponseActive).toBe(false);
    expect(store.activeScenario).toBe("none");
    expect(store.astronaut.x).toBe(ASTRONAUT_START.x);
    expect(store.suit.o2_primary_kg).toBe(1.08);
    expect(store.env.tau).toBe(0.48);
    expect(store.alerts).toEqual([]);
    expect(store.trace).toEqual([]);
    expect(store.routePath).toEqual([]);
    expect(store.pendingActions).toEqual([]);
    expect(store.samples).toEqual([]);
    expect(store.transcripts).toEqual([]);
    expect(store.roverPreviewUrl).toBeNull();
    expect(store.lastDrillDepthCm).toBe(0);
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(subSpy).toHaveBeenCalled();

    unsubReset();
    unsubSub();
  });
});
