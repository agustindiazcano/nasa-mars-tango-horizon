import type { SceneDef } from "../world/sceneDirector";
import type { OverlayItem } from "./overlays";

/**
 * Scenes of the explained video (plan 25). Time is scenario time: the camera and the overlays are keyed to the
 * scene start, so the take can be recorded again at any moment with the same result.
 */

const DIAZ_CANO = { label: "DIAZ-CANO", lat: "4.7560° S", lon: "137.4241° E" } as const;

const COVER: OverlayItem[] = [
  {
    id: "cover",
    kind: "card",
    side: "center",
    fromS: 0.5,
    toS: 24,
    kicker: "NASA SPACE APPS CHALLENGE · BUENOS AIRES 2026",
    title: "TANGO HORIZON",
    subtitle: "Multi-agent AI for crew safety on Mars, with hands-free voice control of every operation",
    stats: [
      { value: "5", label: "LLMs (Gemini 4 ×3, Muse ×2)" },
      { value: "3", label: "custom ML models" },
      { value: "14", label: "AI agents" },
      { value: "6", label: "MCP servers" },
      { value: "5", label: "voice languages" },
    ],
    note: "Simulated robotics in a 3D digital twin of Gale Crater (Three.js, real NASA and USGS terrain) · Vertex AI · Fastify · Web Speech and Cloud TTS",
  },
];

const PROBLEM: OverlayItem[] = [
  {
    id: "problem",
    kind: "card",
    side: "left",
    fromS: 0.5,
    toS: 19,
    kicker: "THE PROBLEM",
    title: "Mars cannot wait for Houston",
    bullets: [
      "4 to 24 minutes of one-way radio delay",
      "Pressurized gloves: controls must work by voice",
      "Suit leaks, dust storms and equipment faults leave no time to wait",
    ],
    note: "Goal: protect the crew with local autonomy.",
  },
];

const ARCHITECTURE: OverlayItem[] = [
  {
    id: "arch",
    kind: "flow",
    fromS: 0.5,
    toS: 33,
    kicker: "ARCHITECTURE",
    title: "One voice. 14 agents. One safety gate.",
    steps: [
      { label: "Voice order", detail: "5 languages, local intents in under 5 ms" },
      { label: "SUIT.VOICE-EXEC", detail: "Fast tier: Gemini 4 Hydrogen" },
      { label: "BASE", detail: "Orchestrator: Gemini 4 Carbon" },
      { label: "Specialists + robots", detail: "Health, EVA planner, science, weather, maintenance, per-robot planners: Gemini 4 Argon" },
      { label: "MCP tools + RAG", detail: "6 in-process servers, BM25 search over NASA-STD-3001" },
      { label: "GUARDIAN", detail: "Rule check, LLM judge, 3-model vote" },
      { label: "Simulator actions", detail: "Rovers, drones, arm, life-support pod" },
    ],
  },
  {
    id: "arch-failover",
    kind: "lower",
    fromS: 12,
    toS: 32,
    title: "Failover: Vertex AI → AI Studio → Meta Muse → offline engine",
    detail: "If every cloud model is unreachable the deterministic offline engine still answers.",
  },
];


const DECISIONS: OverlayItem[] = [
  {
    id: "d1",
    kind: "decision",
    fromS: 0.5,
    toS: 18,
    kicker: "AI DECISIONS AND GUARDRAILS 1 OF 3",
    title: "An order that passes every gate",
    order: "Launch the life-support pod to 32 m from DIAZ-CANO",
    stages: [
      { atS: 2, name: "Hard-limit rule check", detail: "Impact outside the 15 m crew keep-out", result: "pass" },
      { atS: 4.5, name: "LLM safety judge", detail: "Matches crew intent, no untrusted instructions", result: "pass" },
      { atS: 7.5, name: "3-model vote", detail: "Critical action: three providers decide", result: "vote", votes: [{ model: "Gemini Carbon", approve: true }, { model: "Gemini Argon", approve: true }, { model: "Muse Wonder", approve: true }] },
    ],
    verdict: { atS: 10.5, text: "ALLOW", level: "allow" },
  },
  {
    id: "d2",
    kind: "decision",
    fromS: 18.5,
    toS: 36,
    kicker: "AI DECISIONS AND GUARDRAILS 2 OF 3",
    title: "A hard limit blocks it before any model votes",
    order: "Move the manipulator arm to 1.2 m from the crew member",
    stages: [{ atS: 2.5, name: "Hard-limit rule check", detail: "Closer than the 2 m manipulator keep-out", result: "fail" }],
    verdict: { atS: 5, text: "DENY", level: "deny" },
  },
  {
    id: "d3",
    kind: "decision",
    fromS: 36.5,
    toS: 54.5,
    kicker: "AI DECISIONS AND GUARDRAILS 3 OF 3",
    title: "One dissent hands the decision to a human",
    order: "Send the rescue robot next to the injured crew member",
    stages: [
      { atS: 2, name: "Hard-limit rule check", detail: "Slope under 16 degrees, keep-outs respected", result: "pass" },
      { atS: 4.5, name: "LLM safety judge", detail: "No injection, consistent with the mission", result: "pass" },
      { atS: 7.5, name: "3-model vote", detail: "Asymmetric safety override: any reject escalates", result: "vote", votes: [{ model: "Gemini Carbon", approve: true }, { model: "Gemini Argon", approve: true }, { model: "Muse Wonder", approve: false }] },
    ],
    verdict: { atS: 11, text: "ASK HUMAN", level: "ask" },
  },
  {
    id: "d-note",
    kind: "lower",
    fromS: 2,
    toS: 54,
    title: "Gemini 4 Carbon, Gemini 4 Argon and Meta Muse vote independently",
    detail: "Cloud providers fail over automatically; the offline engine keeps the same rule check.",
  },
];

const EVERYTHING: OverlayItem[] = [
  {
    id: "everything",
    kind: "grid",
    fromS: 0.5,
    toS: 27,
    kicker: "AND MORE",
    title: "Everything else we built",
    chips: [
      { label: "Phone as pointer", detail: "QR-paired gyroscope laser pointer and push-to-talk" },
      { label: "Multimodal vision", detail: "Rover camera frames read by a vision agent" },
      { label: "4-DOF robot arm", detail: "Analytic inverse kinematics: drill, sample, photograph, hand over" },
      { label: "Sky-Crane drones", detail: "Tether pendulum physics and LiDAR cone" },
      { label: "GPS-denied navigation", detail: "Map-relative localization, UWB ranging, VIO, flash LiDAR" },
      { label: "Route planning", detail: "A* over the 1 m HiRISE terrain by slope, energy and dose" },
      { label: "NASA and USGS data", detail: "HiRISE, CTX, THEMIS, CRISM, DAN, REMS, RAD, DONKI, MOXIE" },
      { label: "Predictive maintenance", detail: "FDIR trends and remaining useful life for suit and rovers" },
      { label: "Weather and radiation", detail: "Dust, pressure tides and solar-storm alerts" },
      { label: "Standards search", detail: "1,002 chunks of NASA documents in under 2 ms" },
      { label: "Hands-free voice", detail: "5 languages, radio tones, neural speech" },
      { label: "Offline fallback", detail: "Deterministic engine when every cloud model fails" },
    ],
  },
];

const VOICE_RESCUE: OverlayItem[] = [
  { id: "v-crew", kind: "voice", who: "crew", speaker: "DIAZ-CANO · VOICE", fromS: 7, toS: 24, text: "Base, DIAZ-CANO. I fell into the pit. My suit is leaking and I cannot climb out." },
  { id: "v-health", kind: "voice", who: "agent", speaker: "SUIT.HEALTH", fromS: 13.5, toS: 30, text: "Leak confirmed: suit pressure falling 0.12 kPa/s. Hypoxia in about 9 minutes." },
  { id: "v-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 17, toS: 36, text: "Dust storm approaching. Dispatching rescue-1 with the rescue robot and both drones for overwatch." },
  { id: "v-guard", kind: "voice", who: "guardian", speaker: "GUARDIAN", fromS: 24, toS: 38, text: "Route slope under 16 degrees, 15 m keep-out respected. Approved." },
  { id: "v-ack", kind: "voice", who: "crew", speaker: "DIAZ-CANO · VOICE", fromS: 31, toS: 39, text: "Copy, Base. Waiting." },
  { id: "v-coords", kind: "coords", fromS: 14, toS: 40, ...DIAZ_CANO },
  { id: "v-l1", kind: "lower", fromS: 17, toS: 22, title: "rescue-1 dispatched", detail: "1.7 km to the site, ETA 66 s" },
  { id: "v-l2", kind: "lower", fromS: 22, toS: 32, title: "drone-1 and drone-2 launched", detail: "Overwatch at a 25 m standoff, ETA 36 s" },
];

const LIFE_SUPPORT: OverlayItem[] = [
  { id: "l-armed", kind: "lower", fromS: 0.5, toS: 8, title: "Life-support cannon armed", detail: "6 m tube, 90 m/s maximum, 45° elevation" },
  { id: "l-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 1, toS: 14, text: "Launching the 8 kg life-support pod. Impact 32 m from DIAZ-CANO, outside the 15 m keep-out." },
  { id: "l-guard", kind: "voice", who: "guardian", speaker: "GUARDIAN", fromS: 6, toS: 20, text: "Trajectory and keep-out verified. Approved." },
  {
    id: "l-vitals",
    kind: "vitals",
    fromS: 0.5,
    toS: 45,
    title: "DIAZ-CANO · LIFE SUPPORT",
    keys: [
      { atS: 0.5, o2Pct: 41, pao2Kpa: 9.2, co2Pa: 520, batteryWh: 640 },
      { atS: 30, o2Pct: 22, pao2Kpa: 7.4, co2Pa: 690, batteryWh: 610 },
      { atS: 38, o2Pct: 22, pao2Kpa: 7.4, co2Pa: 690, batteryWh: 610 },
      { atS: 44, o2Pct: 96, pao2Kpa: 13.2, co2Pa: 150, batteryWh: 810 },
    ],
    events: [
      { atS: 4, text: "Pod launched, ETA 34 s" },
      { atS: 31, text: "Parachute deployed" },
      { atS: 38, text: "Pod landed 32 m from the crew" },
      { atS: 41, text: "COPV O2, LiOH scrubber and battery connected" },
      { atS: 44, text: "Pressure and CO2 restored" },
    ],
  },
];

const HEALTH: OverlayItem[] = [
  {
    id: "h-card",
    kind: "card",
    side: "left",
    fromS: 0.5,
    toS: 35,
    kicker: "ASTRONAUT HEALTH MONITORING",
    title: "SUIT.HEALTH watches every suit",
    bullets: [
      "Live heart rate, SpO2, core temperature, suit pressure and CO2",
      "Sliding-window trends give a time to breach, not just an alarm",
      "Early Warning Score 0 to 3 against each astronaut's own baseline",
      "Casson blood twin: viscosity and yield stress",
      "Answers cite NASA-STD-3001; advisory only, never a diagnosis",
    ],
  },
  {
    id: "h-vitals",
    kind: "vitals",
    fromS: 6,
    toS: 35,
    title: "DIAZ-CANO · SUIT LEAK",
    keys: [
      { atS: 6, o2Pct: 96, pao2Kpa: 13.1, co2Pa: 150, batteryWh: 800 },
      { atS: 16, o2Pct: 70, pao2Kpa: 11.8, co2Pa: 300, batteryWh: 790 },
      { atS: 30, o2Pct: 41, pao2Kpa: 9.2, co2Pa: 520, batteryWh: 780 },
    ],
    events: [
      { atS: 12, text: "Early Warning Score 1: pressure trend" },
      { atS: 22, text: "Early Warning Score 2: time to hypoxia 9 min" },
    ],
  },
];

const mlCard = (id: string, n: number, title: string, subtitle: string, bullets: string[], note: string): OverlayItem[] => [
  { id, kind: "card", side: "left", fromS: 0.5, toS: 24, kicker: `ML MODEL ${n} OF 3`, title, subtitle, bullets, note },
];

const HYDRATION = mlCard(
  "ml-hydration",
  1,
  "Hydration Prospector",
  "Where to look for water",
  [
    "Maps a relative hydrogen indicator over the 4 × 4 km scene, with its uncertainty",
    "Trained on 1,567 Curiosity DAN neutron stops plus CRISM, THEMIS and CTX layers",
    "500 m blocked validation: Spearman 0.58, error 0.37 against 0.49 for the baseline",
  ],
  "A relative H/OH indicator, not percent water.",
);

const STORM = mlCard(
  "ml-storm",
  2,
  "Storm Nowcaster",
  "Is it safe to go outside?",
  [
    "Quantile gradient boosting forecasts dust opacity 1 to 3 sols ahead",
    "28 pressure-tide features from the REMS station; Mars Year 34 global storm held out",
    "Spearman 0.77 to 0.80 and better than seasonal climatology",
  ],
  "A trend and early-warning indicator: it does not beat persistence on single-station data.",
);

const VEINS = mlCard(
  "ml-veins",
  3,
  "Mineral Vein Detector",
  "Where to drill",
  [
    "DINOv2-small features and a logistic head flag bright-vein candidates in Curiosity photos",
    "117 audited Mastcam and MAHLI images from 22 sols, validated by sol",
    "ROC-AUC 0.85, precision 0.79, recall 0.66, permutation p = 0.002",
  ],
  "A visual candidate only: mineral identity needs ChemCam or CheMin.",
);

const CLOSING: OverlayItem[] = [
  {
    id: "closing",
    kind: "card",
    side: "center",
    fromS: 0.5,
    toS: 14,
    kicker: "TANGO HORIZON",
    title: "SAFETY, AUTONOMY, VOICE",
    subtitle: "tangohorizon.vercel.app",
    note: "github.com/agustindiazcano/nasa-mars-tango-horizon · NASA Space Apps Challenge, Buenos Aires",
  },
];

export const DEMO_SCENES: readonly SceneDef[] = [
  {
    id: "C0",
    nameKey: "scene.c0",
    startS: 0,
    durationS: 25,
    layer: "optical",
    segments: [
      { fromS: 0, kind: "orbit", target: "launch-site", radius: 260, height: 60, startRad: -1.2, speed: 0.07, lookAboveM: 90 },
      { fromS: 14, kind: "aerial", target: "launch-site", offset: { x: 150, y: 25, z: -190 }, lookAboveM: 110 },
    ],
    overlay: COVER,
  },
  {
    id: "P0",
    nameKey: "scene.p0",
    startS: 20,
    durationS: 20,
    segments: [{ fromS: 0, kind: "orbit", target: "base", radius: 95, height: 60, speed: 0.07, lookAboveM: 2 }],
    overlay: PROBLEM,
  },
  {
    id: "A1",
    nameKey: "scene.a1",
    startS: 0,
    durationS: 35,
    segments: [
      { fromS: 0, kind: "orbit", target: "base", radius: 120, height: 70, speed: 0.06, lookAboveM: 2 },
      { fromS: 20, kind: "aerial", target: "launch-site", offset: { x: 240, y: 40, z: -210 }, lookAboveM: 95 },
    ],
    overlay: ARCHITECTURE,
  },
  {
    id: "G1",
    nameKey: "scene.g1",
    startS: 0,
    durationS: 55,
    segments: [
      { fromS: 0, kind: "orbit", target: "base", radius: 110, height: 55, speed: 0.05, lookAboveM: 2 },
      { fromS: 28, kind: "aerial", target: "rover-1", offset: { x: 18, y: 6, z: 16 }, lookAboveM: 1.2 },
    ],
    overlay: DECISIONS,
  },
  {
    id: "F1",
    nameKey: "scene.f1",
    startS: 0,
    durationS: 28,
    segments: [{ fromS: 0, kind: "orbit", target: "base", radius: 140, height: 80, speed: 0.04, lookAboveM: 2 }],
    overlay: EVERYTHING,
  },
  {
    id: "V1",
    nameKey: "scene.v1",
    startS: 48,
    durationS: 40,
    segments: [
      { fromS: 0, kind: "orbit", target: "crew-2", radius: 14, height: 3.5, speed: 0.2, lookAboveM: 1.2 },
      { fromS: 14, kind: "follow", target: "rescue-1", offset: { x: 14, y: 5, z: 12 }, lookAboveM: 1.5 },
      { fromS: 26, kind: "follow", target: "drone-1", offset: { x: 10, y: 5, z: 12 }, lookAboveM: 0 },
    ],
    overlay: VOICE_RESCUE,
  },
  {
    id: "L1",
    nameKey: "scene.l1",
    startS: 72,
    durationS: 46,
    segments: [
      { fromS: 0, kind: "aerial", target: "launcher-1", offset: { x: -12, y: 5, z: 16 }, lookAboveM: 3 },
      { fromS: 9, kind: "follow", target: "pod", offset: { x: 26, y: 9, z: 24 }, lookAboveM: 0 },
      { fromS: 27, kind: "aerial", target: "pod", offset: { x: 9, y: 4, z: 10 }, lookAboveM: 1 },
    ],
    overlay: LIFE_SUPPORT,
  },
  {
    id: "H1",
    nameKey: "scene.h1",
    startS: 52,
    durationS: 36,
    segments: [
      { fromS: 0, kind: "orbit", target: "crew-2", radius: 12, height: 3, speed: 0.15, lookAboveM: 1.2 },
      { fromS: 18, kind: "aerial", target: "pit", offset: { x: 10, y: 9, z: 10 }, lookAboveM: -2 },
    ],
    overlay: HEALTH,
  },
  {
    id: "M1",
    nameKey: "scene.m1",
    startS: 20,
    durationS: 25,
    layer: "hydration",
    segments: [{ fromS: 0, kind: "orbit", target: "base", radius: 520, height: 420, speed: 0.03, lookAboveM: 0 }],
    overlay: HYDRATION,
  },
  {
    id: "M2",
    nameKey: "scene.m2",
    startS: 100,
    durationS: 25,
    layer: "optical",
    segments: [{ fromS: 0, kind: "orbit", target: "base", radius: 140, height: 40, speed: 0.05, lookAboveM: 6 }],
    overlay: STORM,
  },
  {
    id: "M3",
    nameKey: "scene.m3",
    startS: 20,
    durationS: 25,
    layer: "optical",
    segments: [{ fromS: 0, kind: "orbit", target: "rover-1", radius: 14, height: 4, speed: 0.18, lookAboveM: 1.2 }],
    overlay: VEINS,
  },
  {
    id: "E1",
    nameKey: "scene.e1",
    startS: 0,
    durationS: 15,
    segments: [{ fromS: 0, kind: "aerial", target: "launch-site", offset: { x: 150, y: 25, z: -190 }, lookAboveM: 110 }],
    overlay: CLOSING,
  },
];

/** Scenes of the explained video in play order; the older takes stay selectable one by one. */
export const DECK_ORDER: readonly string[] = ["C0", "P0", "A1", "G1", "V1", "L1", "H1", "F1", "M1", "M2", "M3", "S5", "S6", "S7", "E1"];
