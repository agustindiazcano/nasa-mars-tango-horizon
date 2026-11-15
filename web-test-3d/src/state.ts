import { ASTRONAUT_START, MISSION_SITES_BY_ID, type TerrainIdentity } from "@th/shared";
import { ASR_LOCALE, getLang, type Lang } from "./core/i18n";
import { C, directTransmission } from "./core/physics";
import type {
  Action,
  ArmSkillId,
  EnvState,
  HudAlert,
  LayerId,
  MissionContext,
  PanelId,
  PodTelemetry,
  RouteDisplay,
  SampleRecord,
  SuitTelemetry,
  TraceEvent,
  UnitSnapshot,
} from "./core/types";

export interface WorldHooks {
  onLayerChange?(layer: LayerId): void;
  onShowRoute?(toX: number, toZ: number): RouteDisplay | null;
  onDispatch?(unitId: string, x: number, z: number, task: string): void;
  onLaunchPod?(targetX: number, targetZ: number, payload: string): void;
  onDeployBeacons?(beacons: { id: string; x: number; z: number }[], mode: string): void;
  onArmSkill?(skill: ArmSkillId, targetId: string, item?: string): void;
  onStopAll?(): void;
  onUnitAction?(unitId: string, action: string, args: Record<string, unknown>): void;
}

export interface TranscriptMeta {
  metS?: number;
  route?: string[];
  latencyMs?: number;
  lang?: Lang;
  excludeFromHistory?: boolean;
}

export interface TranscriptLine extends TranscriptMeta {
  id?: string;
  who: "you" | "base" | "system";
  text: string;
  final: boolean;
  ts: number;
}

const MAX_RAM_TRANSCRIPTS = 200;

function createInitialAstronaut() {
  return {
    x: ASTRONAUT_START.x,
    z: ASTRONAUT_START.z,
    yaw: 0,
    speed: 0,
    gradePct: 0,
    load_kg: 65,
    body_kg: 78,
    svf: 0.92,
  };
}

function createInitialSuit(): SuitTelemetry {
  return {
    o2_primary_kg: 1.08,
    o2_primary_cap_kg: 1.2,
    o2_reserve_kg: 0.42,
    o2_reserve_cap_kg: 0.45,
    suit_pressure_pa: C.suit_p_nominal.value,
    pao2_pa: C.suit_p_nominal.value - C.p_h2o_alv.value - C.p_co2_alv.value,
    co2_pa: 210,
    battery_wh: 740,
    battery_cap_wh: 800,
    coolant_l: 4.3,
    coolant_cap_l: 4.5,
    metabolic_w: 225,
    heart_rate_bpm: 78,
    fan_rpm: 28400,
    body_temp_c: 36.8,
    cumulative_dose_ugy: 12.4,
  };
}

function createInitialEnv(): EnvState {
  return {
    sol: 4120,
    ls_deg: 215,
    ltst_hours: 11.4,
    pressure_pa: 748,
    air_temp_k: 234,
    ground_temp_k: 248,
    tau: 0.48,
    wind_ms: 5.2,
    wind_dir_rad: 0.65,
    dose_rate_ugy_h: 9.8,
    sun_elev_deg: 54,
    earth_light_time_s: 492, // Design assumption; recorded Horizons epochs are shown separately in the archive.
    storm_source: "Design clear atmosphere",
    rad_source: "Design quiet absorbed dose",
  };
}

function createInitialPodTelemetry(): PodTelemetry {
  return {
    active: false,
    flightTimeS: 0,
    elapsedS: 0,
    impactX: 0,
    impactZ: 0,
    impactSpeed: 0,
    chuteDeployed: false,
    ellipseAlongM: 0,
    ellipseCrossM: 0,
    windDriftM: 0,
  };
}

export class MissionStore {
  terrain?: TerrainIdentity;
  metS = 1420; // 00:23:40 into EVA
  simScale = 1;
  povMode: "1st" | "3rd" = "1st";
  layer: LayerId = "optical";
  panel: PanelId = "none";
  leakDiameterM = 0;
  /** Set when a pod is launched for the current leak; sent to the server so it does not repeat the protocol. */
  emergencyResponseActive = false;
  fanDegraded = false;
  earthLinkDelay = false;
  earthDelayRemainingS = 0;
  lastAgentLatencyMs = 0;
  baseProcessing = false;
  remoteConnected = false;
  remoteRoom = "";
  micListening = false;
  injectionBlockedBanner = false;
  activeScenario: "none" | "storm" | "sep2017" | "leak" = "none";
  scenarioElapsedS = 0;
  selectedBaseModuleId: string | null = null;
  selectedUnitId: string | null = null;
  lastHoveredCoord: { x: number; z: number } | null = null;

  astronaut = createInitialAstronaut();

  suit: SuitTelemetry = createInitialSuit();

  env: EnvState = createInitialEnv();

  fleet: UnitSnapshot[] = [];
  alerts: HudAlert[] = [];
  trace: TraceEvent[] = [];
  routePath: string[] = [];
  pendingActions: Action[] = [];
  activeRoute: RouteDisplay | null = null;
  podTelemetry: PodTelemetry = createInitialPodTelemetry();
  samples: SampleRecord[] = [];
  transcripts: TranscriptLine[] = [];
  roverPreviewUrl: string | null = null;
  roverPreviewCaption = "";
  lastDrillDepthCm = 0;

  private hooks: WorldHooks = {};
  private subs = new Set<() => void>();
  private finalTranscriptSubs = new Set<(line: TranscriptLine) => void>();
  private resetSubs = new Set<() => void>();

  setHooks(hooks: WorldHooks): void {
    this.hooks = hooks;
  }

  subscribe(fn: () => void): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  onTranscriptFinal(fn: (line: TranscriptLine) => void): () => void {
    this.finalTranscriptSubs.add(fn);
    return () => this.finalTranscriptSubs.delete(fn);
  }

  onReset(fn: () => void): () => void {
    this.resetSubs.add(fn);
    return () => this.resetSubs.delete(fn);
  }

  notify(): void {
    for (const fn of this.subs) fn();
  }

  get solarTransmission(): number {
    const mu = Math.max(0.05, Math.sin((this.env.sun_elev_deg * Math.PI) / 180));
    return directTransmission(this.env.tau, mu);
  }

  toContext(): MissionContext {
    const lang: Lang = getLang();
    return {
      terrain: this.terrain,
      lang: ASR_LOCALE[lang],
      met_s: Math.round(this.metS),
      astronaut: {
        x: Number(this.astronaut.x.toFixed(2)),
        z: Number(this.astronaut.z.toFixed(2)),
        speed: Number(this.astronaut.speed.toFixed(2)),
        load_kg: Number(this.astronaut.load_kg.toFixed(2)),
        body_kg: this.astronaut.body_kg,
      },
      suit: {
        o2_primary_kg: Number(this.suit.o2_primary_kg.toFixed(4)),
        o2_reserve_kg: Number(this.suit.o2_reserve_kg.toFixed(4)),
        suit_pressure_pa: Math.round(this.suit.suit_pressure_pa),
        pao2_pa: Math.round(this.suit.pao2_pa),
        co2_pa: Math.round(this.suit.co2_pa),
        battery_wh: Number(this.suit.battery_wh.toFixed(1)),
        coolant_l: Number(this.suit.coolant_l.toFixed(2)),
        metabolic_w: Math.round(this.suit.metabolic_w),
        heart_rate_bpm: Math.round(this.suit.heart_rate_bpm),
        fan_rpm: Math.round(this.suit.fan_rpm),
      },
      env: {
        data_category: "design",
        radiation_quantity: "absorbed_dose_silicon",
        storm_source: this.env.storm_source,
        rad_source: this.env.rad_source,
        pressure_pa: Math.round(this.env.pressure_pa),
        air_temp_k: Number(this.env.air_temp_k.toFixed(1)),
        tau: Number(this.env.tau.toFixed(2)),
        wind_ms: Number(this.env.wind_ms.toFixed(1)),
        dose_rate_ugy_h: Number(this.env.dose_rate_ugy_h.toFixed(2)),
      },
      fleet: this.fleet.map((u) => ({
        id: u.id,
        kind: u.kind,
        x: Number(u.x.toFixed(1)),
        z: Number(u.z.toFixed(1)),
        battery: Number(u.battery.toFixed(3)),
        busy: u.busy,
      })),
      hud: {
        layer: this.layer,
        panel: this.panel === "none" ? null : this.panel,
      },
      leak_diameter_m: this.leakDiameterM,
      emergency_response_active: this.emergencyResponseActive,
    };
  }

  pushAlert(level: "info" | "warn" | "crit", text: string, source?: string): void {
    this.alerts.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      level,
      text,
      source,
      ts: Date.now(),
    });
    if (this.alerts.length > 8) this.alerts.length = 8;
    this.notify();
  }

  pushTranscript(
    who: "you" | "base" | "system",
    text: string,
    final: boolean,
    meta: TranscriptMeta = {},
  ): void {
    const ts = Date.now();
    const metS = meta.metS ?? Math.round(this.metS);
    const route = meta.route?.length ? [...meta.route] : undefined;
    const last = this.transcripts[this.transcripts.length - 1];
    let committed: TranscriptLine;

    if (last && !last.final && last.who === who) {
      last.text = text;
      last.final = final;
      last.ts = ts;
      last.metS = metS;
      if (route) last.route = route;
      if (typeof meta.latencyMs === "number") last.latencyMs = meta.latencyMs;
      if (meta.lang) last.lang = meta.lang;
      if (meta.excludeFromHistory !== undefined) last.excludeFromHistory = meta.excludeFromHistory;
      if (final && !last.id) last.id = `tx-${ts}-${Math.random().toString(36).slice(2, 7)}`;
      committed = last;
    } else {
      committed = {
        ...(final ? { id: `tx-${ts}-${Math.random().toString(36).slice(2, 7)}` } : {}),
        who,
        text,
        final,
        ts,
        metS,
        ...(route ? { route } : {}),
        ...(typeof meta.latencyMs === "number" ? { latencyMs: meta.latencyMs } : {}),
        ...(meta.lang ? { lang: meta.lang } : {}),
        ...(meta.excludeFromHistory ? { excludeFromHistory: true } : {}),
      };
      this.transcripts.push(committed);
      if (this.transcripts.length > MAX_RAM_TRANSCRIPTS) this.transcripts.shift();
    }

    if (final) {
      for (const fn of this.finalTranscriptSubs) fn({ ...committed, route: committed.route ? [...committed.route] : undefined });
    }
    this.notify();
  }

  /** Replace displayed transcripts (e.g. when restoring a saved session) without triggering auto-save. */
  loadTranscriptLines(lines: TranscriptLine[]): void {
    this.transcripts = lines.slice(-MAX_RAM_TRANSCRIPTS).map((line) => ({
      ...line,
      final: true,
      route: line.route ? [...line.route] : undefined,
    }));
    this.notify();
  }

  /** Reset simulation state and clear active RAM transcript while allowing listeners to preserve saved sessions. */
  reset(): void {
    this.metS = 1420;
    this.simScale = 1;
    this.layer = "optical";
    this.panel = "none";
    this.leakDiameterM = 0;
    this.emergencyResponseActive = false;
    this.fanDegraded = false;
    this.earthLinkDelay = false;
    this.earthDelayRemainingS = 0;
    this.lastAgentLatencyMs = 0;
    this.baseProcessing = false;
    this.injectionBlockedBanner = false;
    this.activeScenario = "none";
    this.scenarioElapsedS = 0;
    this.selectedBaseModuleId = null;
    this.selectedUnitId = null;
    this.lastHoveredCoord = null;
    this.astronaut = createInitialAstronaut();
    this.suit = createInitialSuit();
    this.env = createInitialEnv();
    this.alerts = [];
    this.trace = [];
    this.routePath = [];
    this.pendingActions = [];
    this.activeRoute = null;
    this.podTelemetry = createInitialPodTelemetry();
    this.samples = [];
    this.transcripts = [];
    this.roverPreviewUrl = null;
    this.roverPreviewCaption = "";
    this.lastDrillDepthCm = 0;
    for (const fn of this.resetSubs) fn();
    this.notify();
  }

  setLayer(layer: LayerId): void {
    this.layer = layer;
    this.hooks.onLayerChange?.(layer);
    this.notify();
  }

  setPanel(panel: PanelId): void {
    this.panel = panel;
    this.notify();
  }

  setTrace(trace: TraceEvent[], route: string[] = []): void {
    this.trace = trace;
    this.routePath = route;
    this.notify();
  }

  applyActions(actions: Action[]): void {
    for (const a of actions) {
      const verdict = a.verdict;
      if (verdict?.decision === "deny") {
        this.pushAlert("warn", `GUARDIAN DENIED ${a.type}: ${verdict.reason}`, "GUARDIAN");
        continue;
      }
      if (verdict?.decision === "ask_human") {
        this.pendingActions.push(a);
        this.pushAlert("warn", `Confirm required: ${a.type} (${verdict.reason})`, "GUARDIAN");
        continue;
      }
      this.executeApprovedAction(a);
    }
    this.notify();
  }

  findPendingActionIndex(actionType: string): number {
    return this.pendingActions.findIndex((a) => a.type === actionType && a.verdict?.decision === "ask_human");
  }

  confirmPendingAction(index: number, approved: boolean): void {
    const [a] = this.pendingActions.splice(index, 1);
    if (!a) return;
    if (approved) {
      this.executeApprovedAction({
        ...a,
        verdict: { decision: "allow", reason: "Crew confirmed", by: a.verdict?.by ?? "judge" },
      });
      this.pushAlert("info", `Crew confirmed: ${a.type}`);
    } else {
      this.pushAlert("info", `Crew cancelled: ${a.type}`);
    }
    this.notify();
  }

  executeApprovedAction(a: Action): void {
    const args = a.args ?? {};
    switch (a.type) {
      case "set_layer": {
        const layer = args.layer as LayerId;
        if (layer) this.setLayer(layer);
        break;
      }
      case "open_panel": {
        const panel = (args.panel as PanelId) ?? "none";
        this.setPanel(panel);
        break;
      }
      case "show_alert": {
        const lvl = (args.level as "info" | "warn" | "crit") ?? "info";
        this.pushAlert(lvl, String(args.text ?? ""), args.source ? String(args.source) : undefined);
        break;
      }
      case "show_route": {
        const s2 = MISSION_SITES_BY_ID.S2;
        const toX = Number(args.to_x ?? s2.x);
        const toZ = Number(args.to_z ?? s2.z);
        const route = this.hooks.onShowRoute?.(toX, toZ) ?? null;
        if (route) {
          this.activeRoute = route;
          this.pushAlert(
            "info",
            `Route (${route.algorithm}): ${route.distanceM.toFixed(0)} m, ${(route.timeS / 60).toFixed(1)} min, ${(route.o2Kg * 1000).toFixed(0)} g O2`,
          );
        }
        break;
      }
      case "dispatch": {
        const unitId = String(args.unit_id ?? "rescue-1");
        const x = Number(args.x ?? this.astronaut.x);
        const z = Number(args.z ?? this.astronaut.z);
        const task = String(args.task ?? "goto");
        this.hooks.onDispatch?.(unitId, x, z, task);
        break;
      }
      case "launch_pod": {
        const tx = Number(args.target_x ?? this.astronaut.x + 20);
        const tz = Number(args.target_z ?? this.astronaut.z);
        const payload = String(args.payload ?? "full_life_support");
        this.hooks.onLaunchPod?.(tx, tz, payload);
        break;
      }
      case "deploy_beacons": {
        const beacons = Array.isArray(args.beacons)
          ? (args.beacons as { id: string; x: number; z: number }[])
          : [];
        const mode = String(args.mode ?? "drone_drop");
        this.hooks.onDeployBeacons?.(beacons, mode);
        break;
      }
      case "arm_skill": {
        const skill = (args.skill as ArmSkillId) ?? "photograph";
        const targetId = String(args.target_id ?? "T1");
        const item = args.item ? String(args.item) : undefined;
        this.hooks.onArmSkill?.(skill, targetId, item);
        break;
      }
      case "unit_action": {
        this.hooks.onUnitAction?.(String(args.unit_id ?? ""), String(args.action ?? ""), args);
        break;
      }
      case "stop_all": {
        this.hooks.onStopAll?.();
        break;
      }
    }
  }
}
