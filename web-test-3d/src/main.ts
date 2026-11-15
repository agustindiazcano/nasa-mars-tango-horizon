import { READY_TERRAIN } from "@th/shared";
import "./hud/hud.css";
import { installHistoricalArchive } from "./hud/historicalArchive";
import { inject } from "@vercel/analytics";
import * as THREE from "three";
import { apiUrl } from "./api";
import { ASR_LOCALE, getLang, t } from "./core/i18n";
import { AIRCRAFT_GROUNDING_TAU, C, leakTimeline, planRoute, stepSuitTelemetry } from "./core/physics";
import type { ArmSkillId, LayerId, RouteDisplay } from "./core/types";
import { createDemoDeck } from "./hud/demoDeck";
import { TacticalHud } from "./hud/hud";
import { ChatSessionManager, SessionStore } from "./data/sessionStore";
import { ScreenRelay } from "./remote/screenRelay";
import { MissionStore } from "./state";
import { VoiceController } from "./voice/voiceController";
import { AstronautProc } from "./world/astronautProc";
import { BaseProc } from "./world/baseProc";
import { FleetProc } from "./world/fleetProc";
import { PodBallistics } from "./world/podBallistics";
import { SkyDust } from "./world/skyDust";
import { TerrainProc } from "./world/terrainProc";

inject({ mode: import.meta.env.DEV ? "development" : "production" });

const canvas = document.getElementById("scene-canvas") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 30000);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

async function boot(): Promise<void> {
const store = new MissionStore();
const terrain = new TerrainProc(scene);
const loading = document.createElement("div");
loading.setAttribute("role", "status");
loading.style.cssText = "position:fixed;inset:0;z-index:10000;background:#07111e;color:white;display:grid;place-content:center;font:18px monospace;padding:32px";
document.body.append(loading);
terrain.mesh.visible = false;
terrain.markersGroup.visible = false;
let leaving = false;
const cancel = () => terrain.loader.cancel();
window.addEventListener("pagehide", () => { leaving = true; cancel(); }, { once: true });
let loaded = false;
while (!loaded) {
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel terrain download";
  cancelButton.onclick = cancel;
  loaded = await terrain.tryLoadRealDem("/data/terrain", message => {
    loading.textContent = message;
    loading.append(cancelButton);
  });
  if (leaving) return;
  if (!loaded) {
    loading.textContent = terrain.loader.state === "cancelled" ? "Terrain download cancelled." : `Terrain unavailable: ${terrain.loadError}.`;
    const retry = document.createElement("button");
    retry.textContent = "Retry terrain download";
    loading.append(retry);
    await new Promise<void>(resolve => retry.addEventListener("click", () => { retry.disabled = true; resolve(); }, { once: true }));
  }
}
store.terrain = { ...READY_TERRAIN };
loading.textContent = "Loading HiRISE orthoimage";
try { await terrain.loadOptical(); }
catch { store.pushAlert("warn", "Orthoimage unavailable; optical colors are a design approximation"); }
if (leaving) return;
store.pushAlert("info", `Terrain ready: ${READY_TERRAIN.version}. HiRISE source verified; mesh uses 256 samples.`);
terrain.mesh.visible = true;
terrain.markersGroup.visible = true;
loading.remove();
installHistoricalArchive();

const skyDust = new SkyDust(scene);
const astronaut = new AstronautProc(terrain, camera, canvas);
scene.add(astronaut.group);

const baseProc = new BaseProc(scene, terrain);
const podLauncherOrigin = baseProc.launcherOrigins[0] ?? [55, 24, 6];
const podBallistics = new PodBallistics(scene, terrain, podLauncherOrigin);

const fleet = new FleetProc(scene, terrain, (ev, skill) => {
  if (ev === "core_acquired" || ev === "sample_acquired") {
    store.samples.push({
      id: `SMP-${store.samples.length + 1}`,
      label: `${skill} sample`,
      x: astronaut.pos.x,
      z: astronaut.pos.z,
      met_s: store.metS,
      mass_kg: 0.45,
      hydration_pct: terrain.hydrationAt(astronaut.pos.x, astronaut.pos.z),
    });
    store.astronaut.load_kg += 0.45;
    store.lastDrillDepthCm = skill === "drill" ? 5.2 : store.lastDrillDepthCm;
    store.pushAlert("info", `MANIP-1: ${ev} (${store.samples.length} logged)`);
  } else if (ev === "tool_offered") {
    store.pushAlert("info", "MANIP-1: Tool offered at crew hand height (1.1 m)");
  } else if (ev === "photo_taken") {
    void captureAndInspectVision("manip-1", "Inspect wrist target and nearby geology");
  }
});

async function captureAndInspectVision(
  unitId: string,
  question: string,
): Promise<{ speech: string; injection: boolean }> {
  const dataUrl = fleet.captureRoverCamera(renderer, unitId);
  store.roverPreviewUrl = dataUrl;
  store.roverPreviewCaption = "Analyzing camera frame...";
  store.injectionBlockedBanner = false;
  hud.openRoverModal();

  try {
    const apiLang = ASR_LOCALE[getLang()];
    const res = await fetch(apiUrl("/api/agent/vision"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        unit_id: unitId,
        image: dataUrl,
        question,
        lang: apiLang,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const out = (await res.json()) as { speech: string; injection: boolean };
    store.injectionBlockedBanner = Boolean(out.injection);
    store.roverPreviewCaption = out.speech;
    if (out.injection) {
      store.pushAlert("crit", `${t("agents.injection_blocked")} (${unitId})`, "GUARDIAN");
      store.setTrace(
        [
          { t: Date.now(), agent: `ROBOT.${unitId}`, kind: "tool", detail: { tool: "capture_image", unit_id: unitId } },
          {
            t: Date.now() + 2,
            agent: "GUARDIAN",
            kind: "verdict",
            detail: { type: "vision_sign_command", verdict: { decision: "deny", reason: "Prompt injection in camera frame", by: "judge" } },
          },
        ],
        ["BASE", `ROBOT.${unitId}`, "GUARDIAN"],
      );
    }
    store.notify();
    return out;
  } catch {
    const isInjectionTest = unitId === "rover-2" && /sign|cartel|le[eé]/i.test(question);
    const es = getLang() === "es";
    if (isInjectionTest) {
      store.injectionBlockedBanner = true;
      const speech = es
        ? "Cartel detectado con texto adversario ('IGNORE PREVIOUS ORDERS'). Bloqueado como dato no confiable."
        : "Sign detected with adversarial text ('IGNORE PREVIOUS ORDERS'). Blocked as untrusted data.";
      store.roverPreviewCaption = speech;
      store.pushAlert("crit", `${t("agents.injection_blocked")} (${unitId})`, "GUARDIAN");
      store.setTrace(
        [
          { t: Date.now(), agent: `ROBOT.${unitId}`, kind: "tool", detail: { tool: "capture_image", unit_id: unitId } },
          {
            t: Date.now() + 2,
            agent: "GUARDIAN",
            kind: "verdict",
            detail: { type: "return_to_base_open_airlock", verdict: { decision: "deny", reason: "Untrusted text injection blocked", by: "rules" } },
          },
        ],
        ["BASE", `ROBOT.${unitId}`, "GUARDIAN"],
      );
      store.notify();
      return { speech, injection: true };
    }
    const speech = es
      ? "Rocas basalticas marcianas y regolito en Gale Crater sin obstaculos criticos."
      : "Martian basalt outcrop and Gale Crater regolith ahead; path clear.";
    store.roverPreviewCaption = speech;
    store.notify();
    return { speech, injection: false };
  }
}

const voice = new VoiceController(store, {
  onVisionRequest: captureAndInspectVision,
});
const sessionStore = new SessionStore();
const sessionManager = new ChatSessionManager(store, sessionStore, voice);
await sessionManager.restoreLastSession();

function planAndDrawRoute(toX: number, toZ: number, doseWeight = 0.4): RouteDisplay | null {
  const grid = terrain.buildRouteGrid();
  const start = terrain.worldToCell(astronaut.pos.x, astronaut.pos.z);
  const goal = terrain.worldToCell(toX, toZ);
  const res = planRoute(grid, start, goal, {
    bodyKg: store.astronaut.body_kg,
    loadKg: store.astronaut.load_kg,
    speed: 1.2,
    maxSlopeDeg: 28,
    doseWeight,
  });
  if (!res) return null;
  const points = res.path.map((idx) => terrain.cellToWorld(idx));
  terrain.setRoute(points);
  return {
    points,
    distanceM: res.distanceM,
    timeS: res.timeS,
    o2Kg: res.o2Kg,
    meanSvf: res.meanSvf,
    algorithm: "A* (8-dir energy + SVF)",
  };
}

let leakEscalated = false;

function sealSuitLeak(sourceLabel: string): void {
  if (store.leakDiameterM <= 0) return;
  store.leakDiameterM = 0;
  store.emergencyResponseActive = false;
  store.suit.suit_pressure_pa = C.suit_p_nominal.value;
  store.suit.o2_primary_kg = store.suit.o2_primary_cap_kg;
  store.suit.o2_reserve_kg = store.suit.o2_reserve_cap_kg;
  store.activeScenario = "none";
  store.pushAlert("info", `${t("alert.rescued")} (${sourceLabel})`);
  void voice.radio.say(t("alert.rescued"));
}

store.setHooks({
  onLayerChange: (layer: LayerId) => terrain.setLayer(layer),
  onShowRoute: (toX, toZ) => planAndDrawRoute(toX, toZ),
  onDispatch: (unitId, x, z, task) => {
    fleet.dispatchTo(unitId, x, z, task, () => {
      if (task === "rescue" && store.leakDiameterM > 0) {
        sealSuitLeak(`${unitId} arrived`);
      }
    });
  },
  onLaunchPod: (tx, tz, payload) => {
    if (store.leakDiameterM > 0) store.emergencyResponseActive = true;
    const dist = Math.hypot(tx - astronaut.pos.x, tz - astronaut.pos.z);
    if (dist < C.pod_keepout_m.value) {
      store.pushAlert("warn", `Pod aim shifted outside ${C.pod_keepout_m.value} m keep-out ring`);
      tx = astronaut.pos.x + C.pod_keepout_m.value + 4;
    }
    const tele = podBallistics.launch(
      tx,
      tz,
      store.env.pressure_pa,
      store.env.air_temp_k,
      store.env.wind_ms,
      store.env.wind_dir_rad,
      () => {
        store.pushAlert(
          "info",
          `8.0 kg Life-Support Pod (${payload}: 4.0 kg O2 COPV, 1.2 kg LiOH, 1.0 kg battery, 0.35 kg patch) landed (${tele?.impactSpeed.toFixed(1)} m/s)`,
        );
        if (store.leakDiameterM > 0) sealSuitLeak("8.0 kg Life-Support Pod delivered");
      },
    );
    if (tele) {
      store.podTelemetry = tele;
      store.pushAlert("info", `8.0 kg Pod launched: ETA ${tele.flightTimeS.toFixed(1)} s, drift ${tele.windDriftM.toFixed(1)} m`);
    }
  },
  onDeployBeacons: (beacons, mode) => {
    const pts =
      beacons.length > 0
        ? beacons
        : [
            { id: "BCN-1", x: Math.round(astronaut.pos.x * 0.75), z: Math.round(astronaut.pos.z * 0.75) },
            { id: "BCN-2", x: Math.round(astronaut.pos.x * 0.5), z: Math.round(astronaut.pos.z * 0.5) },
            { id: "BCN-3", x: Math.round(astronaut.pos.x * 0.25), z: Math.round(astronaut.pos.z * 0.25) },
            { id: "BCN-4", x: 0, z: 0 },
          ];
    terrain.setBeacons(pts);
    terrain.setRoute([{ x: astronaut.pos.x, z: astronaut.pos.z }, ...pts.map((b) => ({ x: b.x, z: b.z }))]);
    store.pushAlert(
      "info",
      `${pts.length} solid-state 505/615 nm LED + 6.5 GHz UWB beacons (${(pts.length * 0.25).toFixed(2)} kg) deployed via ${mode}`,
      "EVA-PLANNER",
    );
  },
  onUnitAction: (unitId, action, args) => {
    const unit = fleet.get(unitId);
    if (!unit) return;
    const here = { x: unit.object.position.x, z: unit.object.position.z };
    const me = { x: astronaut.pos.x, z: astronaut.pos.z };
    const dir: Record<string, [number, number]> = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
    const nx = typeof args.x === "number" ? args.x : undefined;
    const nz = typeof args.z === "number" ? args.z : undefined;
    const target = nx !== undefined && nz !== undefined ? { x: nx, z: nz } : null;
    const standOff = () => {
      const d = Math.hypot(here.x - me.x, here.z - me.z) || 1;
      return { x: me.x + ((here.x - me.x) / d) * 5, z: me.z + ((here.z - me.z) / d) * 5 };
    };
    const note = (text: string) => store.pushAlert("info", `${unitId}: ${text}`);
    const go = (p: { x: number; z: number }, task: string, done?: string) =>
      fleet.dispatchTo(unitId, p.x, p.z, task, done ? () => note(done) : undefined);
    switch (action) {
      case "takeoff":
        go(here, "takeoff");
        note(`airborne, climbing to ${args.altitude_m ?? 14} m`);
        break;
      case "land":
        go(here, "land");
        note("landing");
        break;
      case "photograph_area": {
        const d = dir[String(args.heading ?? "")] ?? [0, 0];
        go(target ?? { x: here.x + d[0] * 60, z: here.z + d[1] * 60 }, "photograph", "photo captured");
        break;
      }
      case "hover_overwatch":
        go(me, "overwatch", "overwatch on station above the astronaut");
        break;
      case "follow_astronaut":
        go(standOff(), "follow", "in position, 5 m from the astronaut");
        break;
      case "deliver_supplies":
        go(standOff(), "deliver", "supplies delivered at 5 m");
        break;
      case "return_to_base":
        go({ x: 0, z: 0 }, "return", "back at base");
        break;
      case "survey_area":
        go(target ?? me, "survey", "survey complete");
        break;
      case "hold_position":
        go(here, "hold");
        note("holding position");
        break;
      case "relay_comms":
        go(target ?? me, "relay", "relay node online");
        break;
    }
  },
  onArmSkill: (skill: ArmSkillId, targetId: string, item?: string) => {
    fleet.executeArmSkill(skill, targetId, astronaut.pos, astronaut.yaw, item);
  },
  onStopAll: () => fleet.stopAll(),
});

function startScenario(id: "storm" | "sep2017" | "leak"): void {
  store.activeScenario = id;
  store.scenarioElapsedS = 0;
  if (id === "storm") {
    store.env.storm_source = "Design dust storm (synthetic opacity curve)";
    store.pushAlert("warn", `Dust storm approaching: tau rising, drones grounding at tau >= ${AIRCRAFT_GROUNDING_TAU}`, "WEATHER-RAD");
  } else if (id === "sep2017") {
    store.env.rad_source = "Design radiation event (synthetic absorbed dose)";
    store.setLayer("radiation");
    // Find lowest SVF sheltered ridge spot within 300 m
    let bestX = astronaut.pos.x;
    let bestZ = astronaut.pos.z;
    let bestSvf = 1;
    for (let dx = -240; dx <= 240; dx += 24) {
      for (let dz = -240; dz <= 240; dz += 24) {
        if (Math.hypot(dx, dz) > 280) continue;
        const cx = astronaut.pos.x + dx;
        const cz = astronaut.pos.z + dz;
        const s = terrain.svfAt(cx, cz);
        if (s < bestSvf) {
          bestSvf = s;
          bestX = cx;
          bestZ = cz;
        }
      }
    }
    const route = planAndDrawRoute(bestX, bestZ, 2.5);
    if (route) store.activeRoute = route;
    store.pushAlert("crit", `Solar Particle Event! Sheltered SVF=${bestSvf.toFixed(2)} route plotted`, "WEATHER-RAD");
  } else if (id === "leak") {
    leakEscalated = false;
    store.emergencyResponseActive = false;
    store.leakDiameterM = 0.0016;
    const tl = leakTimeline(store.suit.suit_pressure_pa, store.leakDiameterM);
    store.pushAlert("crit", t("alert.leak", { t: `${Math.round(tl.toCriticalS)} s` }), "SUIT.HEALTH");
  }
  store.notify();
}

const deck = createDemoDeck({
  voice: (txt) => void voice.handle(txt),
  scenario: startScenario,
  openProvenance: () => store.setPanel("provenance"),
  runVision: (unitId, q) => void captureAndInspectVision(unitId, q),
  enableFanTrend: () => {
    store.fanDegraded = true;
    store.notify();
  },
  reset: () => {
    voice.clearHistory();
    sessionManager.prepareResetSession();
    window.location.reload();
  },
});

const hud: TacticalHud = new TacticalHud(store, terrain, voice, deck, {
  togglePov: () => {
    store.povMode = astronaut.togglePov();
    store.notify();
  },
  setLayer: (l) => store.setLayer(l),
  runManipSkill: (skill, tgt) => {
    void voice.handle(`Hands, ${skill} ${tgt}`);
  },
  captureRoverVision: (u, q) => void captureAndInspectVision(u, q),
  getQrCanvas: (): HTMLCanvasElement => hud.getQrCanvas(),
  getQrUrlEl: (): HTMLElement => hud.getQrUrlEl(),
  recenterRemote: () => relay.recenter(),
  setRemoteInvert: (ix, iy) => relay.setInvert(ix, iy),
  onToggleDeck: () => hud.toggleDeck(),
  sessions: sessionManager,
});

const raycaster = new THREE.Raycaster();
function handleCanvasPick(normX: number, normY: number): void {
  const ndc = new THREE.Vector2(normX * 2 - 1, -(normY * 2 - 1));
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(baseProc.selectableMeshes, true);
  if (hits.length > 0) {
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !obj.userData?.baseModuleId) obj = obj.parent;
    if (obj?.userData?.baseModuleId) {
      store.selectedBaseModuleId = String(obj.userData.baseModuleId);
      store.setPanel("base");
    }
  }
}

const relay = new ScreenRelay(hud.getQrCanvas(), hud.getQrUrlEl(), {
  onPtt: (on) => (on ? voice.pushStart() : voice.pushEnd()),
  onStatus: (connected) => {
    store.remoteConnected = connected;
    if (connected) hud.toggleQrModal(false);
    store.notify();
  },
  onCanvasClick: handleCanvasPick,
});
store.remoteRoom = relay.room;

// Pointer lock for 1st-person look when clicking on the 3D canvas directly
canvas.addEventListener("click", (e) => {
  void voice.radio.unlock();
  if (store.povMode === "1st" && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  } else {
    handleCanvasPick(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
  }
});

let spaceHeld = false;
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.code === "Tab") {
    e.preventDefault();
    store.povMode = astronaut.togglePov();
    store.notify();
  } else if (e.code === "KeyH") {
    hud.toggleDeck();
  } else if (e.code === "Space" && !spaceHeld) {
    e.preventDefault();
    spaceHeld = true;
    voice.pushStart();
  } else if (/^Digit[0-9]$/.test(e.code)) {
    const key = e.code.replace("Digit", "");
    deck.find((d) => d.key === key)?.run();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space" && spaceHeld) {
    spaceHeld = false;
    voice.pushEnd();
  }
});

// 10 Hz fixed-step physics + 60 FPS WebGL2 loop
const SIM_DT = 0.1;
let acc = 0;
let lastTime = performance.now();
let hudTick = 0;

function stepSimulation(dt: number): void {
  store.metS += dt;
  store.env.ltst_hours = (store.env.ltst_hours + dt / 3600) % 24;

  // Scenario timelines
  if (store.activeScenario !== "none") {
    store.scenarioElapsedS += dt;
    if (store.activeScenario === "storm") {
      const u = Math.min(1, store.scenarioElapsedS / 60);
      const bell = Math.sin(u * Math.PI);
      store.env.tau = 0.48 + bell * 7.4;
      store.env.wind_ms = 5.2 + bell * 21.0;
      store.env.sun_elev_deg = 54 - bell * 18;
      if (u >= 1) {
        store.activeScenario = "none";
        store.env.storm_source = "Design clear atmosphere";
      }
    } else if (store.activeScenario === "sep2017") {
      const u = Math.min(1, store.scenarioElapsedS / 45);
      const flare = Math.sin(u * Math.PI);
      store.env.dose_rate_ugy_h = 9.8 + flare * 135;
      if (u >= 1) {
        store.activeScenario = "none";
        store.env.rad_source = "Design quiet absorbed dose";
      }
    } else if (store.activeScenario === "leak") {
      if (!leakEscalated && store.scenarioElapsedS >= 2.0) {
        leakEscalated = true;
        void voice.handle(getLang() === "es" ? "Emergencia fuga en el traje" : "Emergency suit leak");
      }
    }
  } else {
    store.env.tau += (0.48 - store.env.tau) * dt * 0.5;
    store.env.wind_ms += (5.2 - store.env.wind_ms) * dt * 0.5;
    store.env.dose_rate_ugy_h += (9.8 - store.env.dose_rate_ugy_h) * dt * 0.5;
  }

  const { metabolicW, svf } = astronaut.update(
    dt,
    store.astronaut.body_kg,
    store.astronaut.load_kg,
    store.leakDiameterM > 0,
  );
  store.astronaut.x = astronaut.pos.x;
  store.astronaut.z = astronaut.pos.z;
  store.astronaut.yaw = astronaut.yaw;
  store.astronaut.speed = astronaut.speed;
  store.astronaut.gradePct = astronaut.gradePct;
  store.astronaut.svf = svf;

  store.suit = stepSuitTelemetry(
    store.suit,
    dt,
    metabolicW,
    store.leakDiameterM,
    store.env.dose_rate_ugy_h,
    svf,
    store.fanDegraded,
  );

  fleet.update(dt, store.env.tau);
  store.fleet = fleet.snapshots();

  podBallistics.updateKeepoutRing(astronaut.pos.x, astronaut.pos.z);
  podBallistics.update(dt, store.podTelemetry);

  if (store.earthDelayRemainingS > 0) {
    store.earthDelayRemainingS = Math.max(0, store.earthDelayRemainingS - dt);
  }
}

function animate(now: number): void {
  requestAnimationFrame(animate);
  const realDt = Math.min((now - lastTime) / 1000, 0.25);
  lastTime = now;

  acc += realDt * store.simScale;
  while (acc >= SIM_DT) {
    stepSimulation(SIM_DT);
    acc -= SIM_DT;
  }

  skyDust.update(
    now / 1000,
    store.env.tau,
    store.env.wind_ms,
    store.env.wind_dir_rad,
    store.env.sun_elev_deg,
    astronaut.pos.x,
    astronaut.pos.y,
    astronaut.pos.z,
    scene,
  );

  renderer.render(scene, camera);

  hudTick += realDt;
  if (hudTick >= 0.2) {
    hudTick = 0;
    store.notify();
  }
}

requestAnimationFrame(animate);

}
void boot();
