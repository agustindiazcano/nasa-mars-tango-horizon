import { BASE_ORIGIN, LAUNCHER_PRIMARY_COORD, READY_TERRAIN } from "@th/shared";
import "./hud/hud.css";
import { installHistoricalArchive } from "./hud/historicalArchive";
import { inject } from "@vercel/analytics";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { apiUrl } from "./api";
import { ASR_LOCALE, getLang, t } from "@th/shared";
import { AIRCRAFT_GROUNDING_TAU, C, leakTimeline, planRoute, stepSuitTelemetry } from "@th/shared";
import type { ArmSkillId, LayerId, RouteDisplay } from "@th/shared";
import { createDemoDeck } from "./hud/demoDeck";
import { TacticalHud } from "./hud/hud";
import { ChatSessionManager, SessionStore } from "./data/sessionStore";
import { ScreenRelay } from "./remote/screenRelay";
import { MissionStore } from "./state";
import { VoiceController } from "./voice/voiceController";
import { AstronautProc } from "./world/astronautProc";
import { BaseProc } from "./world/baseProc";
import { CINEMATIC_CAM_IDS, CinematicCams, type CinematicCamId } from "./world/cinematicCams";
import { FleetProc } from "./world/fleetProc";
import { LaunchSiteProc } from "./world/launchSiteProc";
import { PodBallistics } from "./world/podBallistics";
import { trackCrew } from "./world/crewTracker";
import { RocksProc } from "./world/rocksProc";
import { createSkyCraneToggle, SkyCraneProc } from "./world/skyCraneProc";
import { SkyDust } from "./world/skyDust";
import { TerrainProc } from "./world/terrainProc";

inject({ mode: import.meta.env.DEV ? "development" : "production" });

const canvas = document.getElementById("scene-canvas") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 30000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.34,
  0.52,
  0.82,
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
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
loading.textContent = "Loading scientific rasters & MSL DAN stations";
const rasterStatus = await terrain.loadRealRasters("/data/terrain");
if (leaving) return;
if (!rasterStatus.rastersOk) {
  store.pushAlert("warn", "Scientific rasters unavailable; using DEM-derived fallback layers");
}
if (rasterStatus.danCount > 0) {
  store.pushAlert("info", `Loaded ${rasterStatus.danCount} in-scene MSL DAN hydration stations`);
}
store.pushAlert("info", `Terrain ready: ${READY_TERRAIN.version}. HiRISE 2048x2048 DEM verified; adaptive chunked LOD active.`);
terrain.mesh.visible = true;
terrain.markersGroup.visible = true;
loading.remove();
installHistoricalArchive();

const skyDust = new SkyDust(scene);
const astronaut = new AstronautProc(terrain, camera, canvas);
scene.add(astronaut.group);

const baseProc = new BaseProc(scene, terrain);
const launchSite = new LaunchSiteProc(scene, terrain);
const rocks = new RocksProc(scene, terrain);
void rocks;
const skyCrane = new SkyCraneProc(scene, terrain);
createSkyCraneToggle(() => {
  skyCrane.setVisible(!skyCrane.visible);
  return skyCrane.visible;
});
const podLauncherOrigin = baseProc.launcherOrigins[0] ?? [LAUNCHER_PRIMARY_COORD.x, LAUNCHER_PRIMARY_COORD.z, 6];
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
      hydration_index: terrain.hydrationAt(astronaut.pos.x, astronaut.pos.z),
    });
    store.astronaut.load_kg += 0.45;
    store.lastDrillDepthCm = skill === "drill" ? 5.2 : store.lastDrillDepthCm;
    store.pushAlert("info", `ROVER-3: ${ev} (${store.samples.length} logged)`);
  } else if (ev === "tool_offered") {
    store.pushAlert("info", "ROVER-3: Tool offered at crew hand height (1.1 m)");
  } else if (ev === "photo_taken") {
    void captureAndInspectVision("rover-3", "Inspect wrist target and nearby geology");
  }
});

async function captureAndInspectVision(
  unitId: string,
  question: string,
): Promise<{ speech: string; injection: boolean }> {
  const normId = unitId === "helmet" ? "astronaut" : unitId;
  const dataUrl =
    normId === "astronaut"
      ? astronaut.captureHelmetCamera(renderer, scene)
      : fleet.captureRoverCamera(renderer, normId);
  store.activeVisionUnitId = normId;
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
        unit_id: normId,
        image: dataUrl,
        question,
        lang: apiLang,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const out = (await res.json()) as { speech: string; injection: boolean };
    if (!out || typeof out.speech !== "string" || !out.speech.trim()) {
      throw new Error("Invalid vision response");
    }
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
    const speech = t("voice.vision_offline");
    store.roverPreviewCaption = speech;
    store.pushAlert("warn", speech, normId === "astronaut" ? "SUIT.VISION" : `ROBOT.${normId}`);
    store.notify();
    return { speech, injection: false };
  }
}

const voice = new VoiceController(store, {
  onVisionRequest: captureAndInspectVision,
  slopeAt: (x, z) => terrain.slopeAt(x, z),
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
    let plannedMsg = "";
    let arrivalCoords = { x: Math.round(x), z: Math.round(z) };
    const ok = fleet.dispatchTo(
      unitId,
      x,
      z,
      task,
      () => {
        if (task === "rescue" && store.leakDiameterM > 0) {
          sealSuitLeak(`${unitId} arrived`);
        } else {
          store.pushAlert("info", `${unitId}: arrived (${task}) at (${arrivalCoords.x}, ${arrivalCoords.z})`);
        }
      },
      {
        astronautPos: { x: astronaut.pos.x, z: astronaut.pos.z },
        drawRoute: !store.activeRoute,
        onPlanned: (info) => {
          arrivalCoords = { x: Math.round(info.x), z: Math.round(info.z) };
          const dist = Math.round(info.distanceM);
          const eta = Math.max(1, Math.round(info.etaS));
          plannedMsg = `${unitId}: dispatched (${task}) -> (${arrivalCoords.x}, ${arrivalCoords.z}), ${dist} m, ETA ${eta} s`;
        },
      },
    );
    if (ok && plannedMsg) {
      store.pushAlert("info", plannedMsg);
    }
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
            { id: "BCN-1", x: Math.round(BASE_ORIGIN.x + (astronaut.pos.x - BASE_ORIGIN.x) * 0.75), z: Math.round(BASE_ORIGIN.z + (astronaut.pos.z - BASE_ORIGIN.z) * 0.75) },
            { id: "BCN-2", x: Math.round(BASE_ORIGIN.x + (astronaut.pos.x - BASE_ORIGIN.x) * 0.5), z: Math.round(BASE_ORIGIN.z + (astronaut.pos.z - BASE_ORIGIN.z) * 0.5) },
            { id: "BCN-3", x: Math.round(BASE_ORIGIN.x + (astronaut.pos.x - BASE_ORIGIN.x) * 0.25), z: Math.round(BASE_ORIGIN.z + (astronaut.pos.z - BASE_ORIGIN.z) * 0.25) },
            { id: "BCN-4", x: BASE_ORIGIN.x, z: BASE_ORIGIN.z },
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
    const go = (p: { x: number; z: number }, task: string, done?: string) => {
      let plannedMsg = "";
      fleet.dispatchTo(unitId, p.x, p.z, task, done ? () => note(done) : undefined, {
        astronautPos: me,
        drawRoute: !store.activeRoute,
        onPlanned: (info) => {
          if (info.distanceM > 1) {
            const dist = Math.round(info.distanceM);
            const eta = Math.max(1, Math.round(info.etaS));
            plannedMsg = `dispatched (${task}) -> (${Math.round(info.x)}, ${Math.round(info.z)}), ${dist} m, ETA ${eta} s`;
          }
        },
      });
      if (plannedMsg) note(plannedMsg);
    };
    switch (action) {
      case "takeoff":
        if (typeof args.altitude_m === "number") unit.targetAltitude = args.altitude_m;
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
        go({ x: BASE_ORIGIN.x, z: BASE_ORIGIN.z }, "return", "back at base");
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
  onCaptureVision: (unitId: string, question?: string) => {
    const q =
      question ||
      (unitId === "astronaut"
        ? "Describe what the astronaut is seeing through the helmet visor camera"
        : `Describe what ${unitId} onboard camera sees`);
    void captureAndInspectVision(unitId, q).then((res) => {
      store.pushTranscript("base", res.speech, true, {
        route: unitId === "astronaut" ? ["SUIT.VISION"] : [`ROBOT.${unitId}`],
        lang: getLang(),
      });
      void voice.radio.say(res.speech);
    });
  },
  onStopAll: () => fleet.stopAll(),
});

function startScenario(id: "storm" | "sep2017" | "leak"): void {
  store.activeScenario = id;
  store.scenarioElapsedS = 0;
  store.env.data_category = "design";
  store.env.radiation_quantity = "absorbed_dose_silicon";
  if (id === "storm") {
    store.env.storm_source = "Design dust storm (synthetic opacity curve; REMS 2018 archive peak tau = 4.243)";
    store.pushAlert("warn", `Dust storm approaching: tau rising, drones grounding at tau >= ${AIRCRAFT_GROUNDING_TAU}`, "WEATHER-RAD");
  } else if (id === "sep2017") {
    store.env.rad_source = "Design radiation event (synthetic absorbed dose; RAD Sep 2017 archive peak = 25.89 uGy/h)";
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

const cinematic = new CinematicCams(camera);
function enterCinematic(id: number): void {
  if (!CINEMATIC_CAM_IDS.includes(id as CinematicCamId)) return;
  // Astronaut stays in 3rd person underneath (body visible, WASD active); the camera is overridden each frame.
  if (store.povMode !== "cinematic") astronaut.setPovMode("3rd");
  cinematic.begin(id as CinematicCamId);
  store.cinematicCam = id;
  store.povMode = "cinematic";
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
  toggleIso: () => {
    store.povMode = astronaut.toggleIso();
    store.notify();
  },
  setCinematic: (id) => enterCinematic(id),
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
  startScenario,
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
  } else if (!astronaut.consumeWasDragged()) {
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
  } else if (e.code === "KeyV") {
    store.povMode = astronaut.toggleIso();
    store.notify();
  } else if (e.code === "KeyH") {
    hud.toggleDeck();
  } else if (e.code === "KeyU") {
    store.setHudVisible(!store.hudVisible);
  } else if (e.code === "KeyM") {
    store.setPanel(store.panel === "menu" ? "none" : "menu");
  } else if (e.code === "Space" && !spaceHeld) {
    e.preventDefault();
    spaceHeld = true;
    voice.pushStart();
  } else if (e.shiftKey && /^Digit[1-5]$/.test(e.code)) {
    // Digit keys 1..0 belong to the demo deck, so cinematic cameras use Shift+1..5.
    enterCinematic(Number(e.code.replace("Digit", "")));
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

  const { metabolicW, svf } = astronaut.computeBioMetrics(
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
  store.crew = trackCrew(store.crew, astronaut.pos, store.fleet);

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

  astronaut.updateMovement(realDt);
  if (store.povMode === "cinematic") {
    cinematic.update(realDt, {
      timeS: now / 1000,
      heightAt: (x, z) => terrain.heightAt(x, z),
      units: store.fleet,
      astronaut: astronaut.pos,
    });
  }
  launchSite.update(now / 1000);
  skyCrane.update(realDt, store.env.tau);

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

  terrain.updateLod(camera.position.x, camera.position.z);
  composer.render();

  hudTick += realDt;
  if (hudTick >= 0.2) {
    hudTick = 0;
    store.notify();
  }
}

requestAnimationFrame(animate);

}
void boot();
