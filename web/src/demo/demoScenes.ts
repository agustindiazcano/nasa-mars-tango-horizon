import type { SceneDef } from "../world/sceneDirector";
import { STORM_TAU, STORM_TAU_FULL } from "../world/stormTau";
import type { OverlayItem } from "./overlays";

/**
 * Scenes of the explained video (plan 25). Time is scenario time: the camera and the overlays are keyed to the
 * scene start, so the take can be recorded again at any moment with the same result.
 */

const DIAZ_CANO = { label: "ASTRONAUT", lat: "4.7560° S", lon: "137.4241° E" } as const;

/** The Tango Horizon patch (project logo) at the top of the cover and the closing slide. */
const PATCH = (id: string, fromS: number, toS: number): OverlayItem => ({
  id,
  kind: "image",
  place: "patch",
  fromS,
  toS,
  src: "/images/th-patch.png",
  caption: "Tango Horizon: Mars Exploration",
});

/** Partner logos, cropped from the project banner and shown as a row with their names. */
const SUPPORTERS = (id: string, fromS: number, toS: number): OverlayItem => ({
  id,
  kind: "logos",
  fromS,
  toS,
  heading: "SUPPORTED BY",
  footer: "LOCAL NODE: BUENOS AIRES, ARGENTINA · 87 PROJECTS · 450 PARTICIPANTS",
  logos: [
    { src: "/images/logos/space-apps.png", name: "NASA Space Apps Challenge" },
    { src: "/images/logos/nasa.png", name: "NASA" },
    { src: "/images/logos/conae.png", name: "CONAE", sub: "Comisión Nacional de Actividades Espaciales" },
    { src: "/images/logos/up.png", name: "Universidad de Palermo" },
    { src: "/images/logos/ibm.png", name: "IBM" },
  ],
});

const COVER: OverlayItem[] = [
  PATCH("cover-patch", 0.3, 13.5),
  SUPPORTERS("cover-logos", 1.5, 13.5),
  {
    id: "cover",
    kind: "card",
    side: "center",
    fromS: 0.5,
    toS: 13.5,
    kicker: "NASA SPACE APPS CHALLENGE · BUENOS AIRES 2026 · IMPACT CATEGORY WINNER",
    title: "TANGO HORIZON: AI SYSTEMS FOR EVA AND MARS EXPLORATION",
    subtitle: "A multi-agent AI system that autonomously orchestrates the whole base: operations and safety, predictive health monitoring of every astronaut with RAG over NASA standards, and rescues",
    stats: [
      { value: "5", label: "LLMs (Gemini 4 ×3, Muse ×2)", icon: "brain" },
      { value: "3", label: "custom ML models", icon: "flask" },
      { value: "14", label: "AI agents", icon: "robot" },
      { value: "6", label: "MCP servers", icon: "layers" },
      { value: "5", label: "voice languages", icon: "globe" },
    ],
  },
];

const PROBLEM: OverlayItem[] = [
  {
    id: "problem",
    kind: "card",
    side: "left",
    fromS: 0.5,
    toS: 10.5,
    kicker: "THE PROBLEM",
    icon: "clock",
    title: "Mars cannot wait for Houston",
    bulletIcons: ["radio", "mic", "alert"],
    bullets: [
      "4 to 24 minutes of one-way radio delay",
      "Pressurized gloves: controls must work by voice",
      "Suit leaks, dust storms and equipment faults leave no time to wait",
    ],
    note: "Goal: protect the crew with local autonomy.",
  },
];

/** The full capability list, taken from the "Core Features" section of the README. */
const CAPABILITIES: OverlayItem[] = [
  {
    id: "caps",
    kind: "grid",
    fromS: 0.5,
    toS: 30,
    kicker: "CAPABILITIES",
    title: "Everything Tango Horizon does",
    chips: [
      { icon: "mic", label: "Hands-free voice", detail: "5 languages, local emergency intents under 5 ms, radio tones" },
      { icon: "brain", label: "Autonomous orchestration", detail: "BASE, five specialists and one agent per robot run the whole base" },
      { icon: "shield", label: "GUARDIAN safety", detail: "Hard rules, an AI judge and a three-model vote" },
      { icon: "rescue", label: "Autonomous rescue", detail: "Started by voice or by suit, rover and storm alarms" },
      { icon: "pod", label: "Life-support pod", detail: "8 kg ballistic pod: oxygen, CO2 scrubber and battery" },
      { icon: "heart", label: "Predictive health (RAG)", detail: "Trends, time to breach and warning score, with NASA-STD-3001 citations" },
      { icon: "book", label: "RAG over NASA standards", detail: "1,002 chunks in under 2 ms feed health, fault and weather warnings, with page citations" },
      { icon: "wrench", label: "Operations monitoring", detail: "Predictive maintenance of suit, rovers, base power and ISRU: fault codes and remaining life" },
      { icon: "satellite", label: "GPS-denied navigation", detail: "Map matching, UWB ranging, VIO and flash LiDAR" },
      { icon: "eye", label: "Camera vision", detail: "Helmet, rover and drone cameras read by vision models" },
      { icon: "flask", label: "3 custom ML models", detail: "Water, dust storms and mineral veins from NASA data" },
      { icon: "map", label: "Map and 6 terrain layers", detail: "NASA and USGS style cartography; phone laser pointer" },
    ],
  },
];

/** Predictive use of the document search for health, maintenance and weather (README: Predictive Telemetry). */
const PREDICTIVE_RAG: OverlayItem[] = [
  {
    id: "q-card",
    kind: "card",
    side: "left",
    fromS: 0.5,
    toS: 30,
    kicker: "PREDICTIVE RAG",
    icon: "book",
    title: "Search that warns before the failure",
    bullets: [
      "Health: minutes to breach and a 0 to 3 warning score per astronaut",
      "Maintenance: remaining useful life and fault codes for suit, rovers and base",
      "Weather: pressure tides and dust ramps trigger early maneuvers",
      "Each answer cites its NASA document and page",
    ],
    bulletIcons: ["heart", "wrench", "storm", "check"],
    stats: [
      { value: "1,002", label: "chunks", icon: "layers" },
      { value: "15", label: "documents", icon: "book" },
      { value: "<2 ms", label: "search", icon: "clock" },
    ],
    note: "Decision support advisory only; not a medical diagnosis.",
  },
];

const ARCHITECTURE: OverlayItem[] = [
  {
    id: "arch",
    kind: "graph",
    fromS: 0.5,
    toS: 27,
    kicker: "ARCHITECTURE · AUTONOMOUS ORCHESTRATION",
    title: "One AI team runs the whole base on its own",
    nodes: [
      { id: "voice", label: "ASTRONAUT", detail: "Hands-free voice, 5 languages", x: 16, y: 6, w: 26, tone: "crew", atS: 0.8 },
      { id: "exec", label: "SUIT.VOICE-EXEC", detail: "Fast tier, under 5 ms locally", x: 16, y: 17, w: 26, tone: "agent", atS: 2.4 },
      { id: "base", label: "BASE", detail: "Orchestrator: plans and delegates", x: 50, y: 27, w: 28, tone: "agent", atS: 4 },
      { id: "health", label: "SUIT.HEALTH", detail: "Vitals and trends", x: 86, y: 5, w: 24, tone: "agent", atS: 5.4 },
      { id: "eva", label: "EVA-PLANNER", detail: "Routes by slope and dose", x: 86, y: 14.5, w: 24, tone: "agent", atS: 6.2 },
      { id: "weather", label: "WEATHER-RAD", detail: "Dust and radiation", x: 86, y: 24, w: 24, tone: "agent", atS: 7 },
      { id: "maint", label: "MAINTENANCE", detail: "Faults and spares", x: 86, y: 33.5, w: 24, tone: "agent", atS: 7.8 },
      { id: "robots", label: "ROBOT planners", detail: "Rover, drones, arm, rescue", x: 50, y: 40, w: 28, tone: "robot", atS: 9.4 },
      { id: "guard", label: "GUARDIAN", detail: "Rules, judge, 3-model vote", x: 50, y: 50.5, w: 28, tone: "guard", atS: 11.2 },
      { id: "sim", label: "SIMULATOR", detail: "Every robot moves", x: 16, y: 50.5, w: 26, tone: "world", atS: 13 },
    ],
    edges: [
      { from: "voice", to: "exec", atS: 1.6 },
      { from: "exec", to: "base", atS: 3.2 },
      { from: "base", to: "health", atS: 4.6 },
      { from: "base", to: "eva", atS: 5.4 },
      { from: "base", to: "weather", atS: 6.2 },
      { from: "base", to: "maint", atS: 7 },
      { from: "base", to: "robots", atS: 8.6 },
      { from: "robots", to: "guard", atS: 10.4 },
      { from: "guard", to: "sim", atS: 12.2, label: "approved" },
    ],
  },
  { id: "a-crew", kind: "voice", who: "crew", speaker: "ASTRONAUT · VOICE", fromS: 1, toS: 9, text: "Send the rover to the pit." },
  { id: "a-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 4.6, toS: 15, text: "Route from EVA-PLANNER, motion from the rover planner." },
  { id: "a-guard", kind: "voice", who: "guardian", speaker: "GUARDIAN", fromS: 11.6, toS: 21, text: "Slope and keep-out checked. Approved." },
  {
    id: "arch-failover",
    kind: "lower",
    fromS: 15,
    toS: 26,
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
    kicker: "AI DECISIONS AND GUARDRAILS 1 OF 2",
    title: "An order that passes every gate",
    order: "Launch the life-support pod to 32 m from the astronaut",
    stages: [
      { atS: 2, name: "Hard-limit rule check", detail: "Impact outside the 15 m crew keep-out", result: "pass" },
      { atS: 4.5, name: "LLM safety judge", detail: "Matches crew intent, no untrusted instructions", result: "pass" },
      { atS: 7.5, name: "3-model vote", detail: "Critical action: three providers decide", result: "vote", votes: [{ model: "Gemini Carbon", approve: true }, { model: "Gemini Argon", approve: true }, { model: "Muse Wonder", approve: true }] },
    ],
    verdict: { atS: 10.5, text: "ALLOW", level: "allow" },
  },
  {
    id: "d3",
    kind: "decision",
    fromS: 18.5,
    toS: 36.5,
    kicker: "AI DECISIONS AND GUARDRAILS 2 OF 2",
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
    toS: 36,
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
      { icon: "phone", label: "Phone as pointer", detail: "QR-paired gyroscope laser pointer and push-to-talk" },
      { icon: "eye", label: "Multimodal vision", detail: "Rover camera frames read by a vision agent" },
      { icon: "roverArm", label: "4-DOF robot arm", detail: "Analytic inverse kinematics: drill, sample, photograph, hand over" },
      { icon: "drone", label: "Sky-Crane drones", detail: "Tether pendulum physics and LiDAR cone" },
      { icon: "satellite", label: "GPS-denied navigation", detail: "Map-relative localization, UWB ranging, VIO, flash LiDAR" },
      { icon: "route", label: "Route planning", detail: "A* over the 1 m HiRISE terrain by slope, energy and dose" },
      { icon: "layers", label: "NASA and USGS data", detail: "HiRISE, CTX, THEMIS, CRISM, DAN, REMS, RAD, DONKI, MOXIE" },
      { icon: "wrench", label: "Predictive maintenance", detail: "FDIR trends and remaining useful life for suit and rovers" },
      { icon: "storm", label: "Weather and radiation", detail: "Dust, pressure tides and solar-storm alerts" },
      { icon: "book", label: "Standards search", detail: "1,002 chunks of NASA documents in under 2 ms" },
      { icon: "mic", label: "Hands-free voice", detail: "5 languages, radio tones, neural speech" },
      { icon: "offline", label: "Offline fallback", detail: "Deterministic engine when every cloud model fails" },
    ],
  },
];

const VOICE_RESCUE: OverlayItem[] = [
  { id: "v-crew", kind: "voice", who: "crew", speaker: "ASTRONAUT · VOICE", fromS: 0.3, toS: 8, text: "Base, I fell into the pit. My suit is leaking." },
  { id: "v-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 3.5, toS: 13, text: "Dust storm approaching. Dispatching rescue-1, the rescue robot and both drones." },
  { id: "v-guard", kind: "voice", who: "guardian", speaker: "GUARDIAN", fromS: 8, toS: 16, text: "Route slope under 16 degrees, 15 m keep-out respected. Approved." },
  { id: "v-coords", kind: "coords", fromS: 2, toS: 22, ...DIAZ_CANO },
  { id: "v-l1", kind: "lower", icon: "rescue", fromS: 5, toS: 12, title: "rescue-1 on its way", detail: "1.7 km to the site, ETA 66 s" },
  { id: "v-l2", kind: "lower", icon: "drone", fromS: 12, toS: 22, title: "drone-1 and drone-2 flying to the pit", detail: "Overwatch at a 25 m standoff, ETA 36 s" },
];

/**
 * The launch take is short: the pod flies about 2.2 times faster than real time (34 s become about 15 s), a side-view
 * animation shows the arc, and the vitals and events follow the shortened flight (launch 4, canopy 16.3, landing 19.5).
 */
const LIFE_SUPPORT: OverlayItem[] = [
  { id: "l-armed", kind: "lower", icon: "cannon", fromS: 0.5, toS: 6, title: "Life-support cannon armed", detail: "6 m tube, 90 m/s maximum, 45° elevation" },
  { id: "l-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 1, toS: 11, text: "Launching the 8 kg life-support pod. Impact 32 m from the astronaut, outside the 15 m keep-out." },
  { id: "l-guard", kind: "voice", who: "guardian", speaker: "GUARDIAN", fromS: 5, toS: 15, text: "Trajectory and keep-out verified. Approved." },
  {
    id: "l-arc",
    kind: "arc",
    fromS: 0.5,
    toS: 25.5,
    kicker: "LIFE-SUPPORT LAUNCH · SIDE VIEW",
    title: "From the launcher to the astronaut",
    caption: "Ballistic arc from the cannon, parachute opening and touchdown outside the 15 m keep-out (sped up, not to scale)",
  },
  {
    id: "l-vitals",
    kind: "vitals",
    fromS: 0.5,
    toS: 25.5,
    title: "ASTRONAUT · LIFE SUPPORT",
    keys: [
      { atS: 0.5, o2Pct: 41, pao2Kpa: 9.2, co2Pa: 520, batteryWh: 640 },
      { atS: 16.3, o2Pct: 22, pao2Kpa: 7.4, co2Pa: 690, batteryWh: 610 },
      { atS: 19.5, o2Pct: 22, pao2Kpa: 7.4, co2Pa: 690, batteryWh: 610 },
      { atS: 24.5, o2Pct: 96, pao2Kpa: 13.2, co2Pa: 150, batteryWh: 810 },
    ],
    events: [
      { atS: 4, text: "Pod launched, flight about 34 s (sped up)" },
      { atS: 16.3, text: "Parachute deployed" },
      { atS: 19.5, text: "Pod landed 32 m from the crew" },
      { atS: 21.5, text: "Life-support pod supplies connected to the suit" },
      { atS: 24.5, text: "Pressure and CO2 restored" },
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
    kicker: "PREDICTIVE HEALTH MONITORING",
    icon: "heart",
    title: "SUIT.HEALTH predicts problems before the alarm",
    bulletIcons: ["heart", "chart", "alert", "dna", "book"],
    bullets: [
      "Live heart rate, SpO2, core temperature, suit pressure and CO2",
      "Sliding-window trends give a time to breach, not just an alarm",
      "Early Warning Score 0 to 3 against each astronaut's own baseline",
      "Casson blood twin: viscosity and yield stress",
      "RAG over NASA-STD-3001 supplies the limits and cites the page; advisory only, never a diagnosis",
    ],
  },
  {
    id: "h-vitals",
    kind: "vitals",
    fromS: 6,
    toS: 35,
    title: "ASTRONAUT · SUIT LEAK",
    keys: [
      { atS: 6, o2Pct: 96, pao2Kpa: 13.1, co2Pa: 150, batteryWh: 800 },
      { atS: 16, o2Pct: 70, pao2Kpa: 11.8, co2Pa: 300, batteryWh: 790 },
      { atS: 24, o2Pct: 44, pao2Kpa: 9.0, co2Pa: 540, batteryWh: 785 },
      { atS: 33, o2Pct: 27, pao2Kpa: 7.7, co2Pa: 700, batteryWh: 780 },
    ],
    events: [
      { atS: 12, text: "Early Warning Score 1: pressure trend" },
      { atS: 18, text: "Early Warning Score 2: oxygen dropping" },
      { atS: 24, text: "Early Warning Score 3: ALARM" },
    ],
  },
  { id: "h-alarm", kind: "lower", level: "alert", fromS: 24, toS: 35, title: "ALARM: astronaut in danger", detail: "Pressure and SpO2 falling, hypoxia in about 9 minutes. BASE notified." },
  { id: "h-agent", kind: "voice", who: "agent", speaker: "SUIT.HEALTH", fromS: 24.5, toS: 35, text: "Alarm raised: pressure and SpO2 are falling, hypoxia in about 9 minutes. Notifying BASE (NASA-STD-3001 limit exceeded)." },
  { id: "h-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 29, toS: 35, text: "Rescue plan started: rescue vehicle, robot and drones dispatched." },
];

const TOWING_IMAGE = (id: string, fromS: number, toS: number): OverlayItem => ({
  id,
  kind: "image",
  fromS,
  toS,
  src: "/media/rescue-robot-towing.jpg",
  caption: "rescue-bot-1 tows the casualty on the stretcher",
});

/** Column slot of the decision graphs (drawing units). */
const slot = (i: number): number => 6.5 + i * 10.5;
const FLOW_X = 19;
const BASE_PT = { x: 50, y: 34 } as const;
const PIT_PT = { x: 76, y: 14 } as const;

/** Straight leg from `a` to `b`, timed `t0` to `t1`. */
const leg = (a: { x: number; y: number }, b: { x: number; y: number }, t0: number, t1: number) => [
  { atS: t0, x: a.x, y: a.y },
  { atS: t1, x: b.x, y: b.y },
];

/** Chain edges between consecutive boxes: each arrow is drawn one second after its source box appears. */
const chain = (ids: string[], atS: number[], labels: Record<number, string> = {}) =>
  ids.slice(0, -1).map((id, i) => ({ from: id, to: ids[i + 1], atS: atS[i] + 1, label: labels[i] }));

/** Worked example of a voice order: the astronaut sends two drones to the pit and the AI chain runs. */
const VOICE_TO_DRONE_FULL: OverlayItem[] = [
  {
    id: "w-graph",
    kind: "graph",
    fromS: 0.5,
    toS: 50,
    kicker: "FROM VOICE TO ROBOT",
    title: "How a spoken order moves a drone",
    nodes: [
      { id: "voice", label: "ASTRONAUT", detail: "Voice order, gloves on", x: FLOW_X, y: slot(0), tone: "crew", atS: 0.8 },
      { id: "exec", label: "SUIT.VOICE-EXEC", detail: "Fast tier: intent and language", x: FLOW_X, y: slot(1), tone: "agent", atS: 3.4 },
      { id: "base", label: "BASE", detail: "Orchestrator: picks the robots", x: FLOW_X, y: slot(2), tone: "agent", atS: 5.6 },
      { id: "robots", label: "ROBOT.drone-1 · drone-2", detail: "Each plans path and altitude", x: FLOW_X, y: slot(3), tone: "robot", atS: 7.8 },
      { id: "guard", label: "GUARDIAN", detail: "Keep-out, slope, judge, vote", x: FLOW_X, y: slot(4), tone: "guard", atS: 10 },
      { id: "act", label: "SIMULATOR · fly_to ×2", detail: "Both drones take off", x: 79, y: 6.5, w: 38, tone: "world", atS: 12.2 },
    ],
    edges: [
      ...chain(["voice", "exec", "base", "robots", "guard"], [0.8, 3.4, 5.6, 7.8]),
      { from: "guard", to: "act", atS: 11.2, label: "approved" },
    ],
    map: {
      live: true,
      x: 59.5,
      y: 11,
      w: 40,
      h: 40,
      label: "TOP VIEW · SCHEMATIC",
      marks: [
        { ...BASE_PT, label: "BASE", tone: "world" },
        { ...PIT_PT, label: "PIT · ASTRONAUT", r: 5, tone: "crew" },
      ],
    },
    tokens: [
      { id: "t-d1", label: "DRONE-1", tone: "robot", path: [{ atS: 1, x: BASE_PT.x - 6, y: BASE_PT.y - 5 }, ...leg({ x: BASE_PT.x - 6, y: BASE_PT.y - 5 }, { x: 70, y: 18 }, 11.5, 47.5)] },
      {
        id: "t-d2",
        label: "DRONE-2",
        tone: "robot",
        path: [{ atS: 1, x: BASE_PT.x + 5, y: BASE_PT.y - 5 }, ...leg({ x: BASE_PT.x + 5, y: BASE_PT.y - 5 }, { x: 84, y: 20 }, 11.5, 47.5)],
      },
    ],
  },
  { id: "w-visor", kind: "visor", fromS: 0, toS: 33, label: "" },
  { id: "w-crew", kind: "voice", who: "crew", speaker: "ASTRONAUT · VOICE", fromS: 1, toS: 10, text: "Drones, fly to the pit and keep watch from 25 meters." },
  { id: "w-exec", kind: "voice", who: "agent", speaker: "SUIT.VOICE-EXEC", fromS: 3.8, toS: 14, text: "Intent: fly_to and overwatch, two robots. Escalating to BASE." },
  { id: "w-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 6, toS: 18, text: "Assigning drone-1 and drone-2. Standoff 25 m, altitudes 22 m and 28 m." },
  { id: "w-guard", kind: "voice", who: "guardian", speaker: "GUARDIAN", fromS: 10.4, toS: 22, text: "Flight corridor and keep-out checked. Approved." },
  { id: "w-drone", kind: "voice", who: "agent", speaker: "ROBOT.drone-1", fromS: 14, toS: 30, text: "Taking off. On station in about 36 seconds." },
  { id: "w-lower", kind: "lower", icon: "voicewave", fromS: 30, toS: 48, title: "The astronaut only speaks", detail: "Five agents and three safety checks turn the order into two flight plans." },
];

/** Helmet view with the live HUD: a glow tour of each panel, then voice orders to the rover, drone and base. */
const HELMET_TOUR: OverlayItem[] = [
  { id: "u-visor", kind: "visor", fromS: 0, toS: 48, label: "" },
  { id: "u-g-top", kind: "glow", target: "#hud-top", fromS: 0.8, toS: 3.4, icon: "hud", label: "MISSION BAR", detail: "Clock, link, language and AI latency", side: "below" },
  { id: "u-g-left", kind: "glow", target: "#hud-left", fromS: 3.4, toS: 6, icon: "heart", label: "LIFE SUPPORT", detail: "O2, pressure, CO2, battery and coolant, live", side: "right" },
  { id: "u-g-right", kind: "glow", target: "#hud-right", fromS: 6, toS: 8.6, icon: "storm", label: "ENVIRONMENT", detail: "Dust, wind, radiation and the storm forecast", side: "left" },
  { id: "u-g-crew", kind: "glow", target: "#hud-crew", fromS: 8.6, toS: 11, icon: "astronaut", label: "CREW TRACKER", detail: "Every astronaut: status and distance", side: "right" },
  { id: "u-g-bottom", kind: "glow", target: "#hud-bottom", fromS: 11, toS: 14, icon: "mic", label: "VOICE AND CONTROLS", detail: "Push-to-talk, layers and cameras", side: "above" },
  { id: "u-c1", kind: "voice", who: "crew", speaker: "ASTRONAUT · VOICE", fromS: 12.5, toS: 19, text: "Hands, pick up the dark basalt rock." },
  { id: "u-r1", kind: "voice", who: "agent", speaker: "ROBOT.rover-3", fromS: 15, toS: 26, text: "Driving to the rock. Lowering the scoop arm to lift it." },
  { id: "u-c2", kind: "voice", who: "crew", speaker: "ASTRONAUT · VOICE", fromS: 20.5, toS: 27, text: "Drone one, come to my position." },
  { id: "u-gd", kind: "voice", who: "guardian", speaker: "GUARDIAN", fromS: 23, toS: 31, text: "Flight path and keep-out checked. Approved." },
  { id: "u-c3", kind: "voice", who: "crew", speaker: "ASTRONAUT · VOICE", fromS: 27, toS: 33, text: "Rover two, move closer." },
  { id: "u-r2", kind: "voice", who: "agent", speaker: "ROBOT.rover-2", fromS: 29, toS: 38, text: "On my way. Driving to your position." },
  { id: "u-c4", kind: "voice", who: "crew", speaker: "ASTRONAUT · VOICE", fromS: 33.5, toS: 40, text: "Base, what is the air pressure outside?" },
  { id: "u-w", kind: "voice", who: "agent", speaker: "WEATHER-RAD", fromS: 36, toS: 44, text: "About 7 hectopascals today, under 1 percent of Earth sea level." },
  { id: "u-c5", kind: "voice", who: "crew", speaker: "ASTRONAUT · VOICE", fromS: 39.5, toS: 45, text: "How is my suit?" },
  { id: "u-h", kind: "voice", who: "agent", speaker: "SUIT.HEALTH", fromS: 41.5, toS: 48, text: "Oxygen, pressure and CO2 are nominal. No fault on the fan or the battery." },
];

/** Big map at the start of the operation: where every robot and astronaut is, and the route A* found for rescue-1. */
const OPERATION_MAP: OverlayItem[] = [
  {
    id: "o-map",
    kind: "map",
    fromS: 0.4,
    toS: 17,
    kicker: "OPERATION MAP",
    title: "Where everyone is when the rescue starts",
    caption: "Route of rescue-1 found by A* over the terrain slope grid · rovers, drones and the four astronauts update live",
  },
];

/** Compresses the timing of an overlay list by `k` (graph boxes, arrows and tokens included). */
const scaleTiming = (items: OverlayItem[], k: number): OverlayItem[] =>
  items.map((i) => {
    const base = { ...i, fromS: i.fromS * k, toS: i.toS * k };
    if (i.kind !== "graph") return base as OverlayItem;
    return {
      ...base,
      nodes: i.nodes.map((n) => ({ ...n, atS: n.atS * k })),
      edges: i.edges.map((e) => ({ ...e, atS: e.atS * k })),
      tokens: i.tokens?.map((t) => ({ ...t, path: t.path.map((p) => ({ ...p, atS: p.atS * k })) })),
    } as OverlayItem;
  });

/** The rescue as one animated flow: alarm, decision, planning, robots, safety gate, motion. */
const RESCUE_FLOW_FULL: OverlayItem[] = [
  {
    id: "r-graph",
    kind: "graph",
    fromS: 0.5,
    toS: 46,
    kicker: "RESCUE FLOW",
    title: "From alarm to extraction",
    nodes: [
      { id: "health", label: "SUIT.HEALTH", detail: "Alarm: leak, hypoxia in about 9 min", x: FLOW_X, y: slot(0), tone: "agent", atS: 0.8 },
      { id: "base", label: "BASE", detail: "Decision: rescue now, storm coming", x: FLOW_X, y: slot(1), tone: "agent", atS: 3.4 },
      { id: "plan", label: "EVA + WEATHER", detail: "EVA-PLANNER route, storm window", x: FLOW_X, y: slot(2), tone: "agent", atS: 6 },
      { id: "robots", label: "ROBOTS", detail: "rescue-1, rescue-bot-1, drone-1, drone-2", x: FLOW_X, y: slot(3), tone: "robot", atS: 8.6 },
      { id: "guard", label: "GUARDIAN", detail: "Every action: rules, judge, vote", x: FLOW_X, y: slot(4), tone: "guard", atS: 11.2 },
      { id: "act", label: "SIMULATOR", detail: "Dispatch, hook, drag, return", x: 79, y: 6.5, w: 38, tone: "world", atS: 13.8 },
    ],
    edges: [
      ...chain(["health", "base", "plan", "robots", "guard"], [0.8, 3.4, 6, 8.6]),
      { from: "guard", to: "act", atS: 12.8, label: "approved" },
    ],
    map: {
      live: true,
      x: 59.5,
      y: 11,
      w: 40,
      h: 40,
      label: "TOP VIEW · SCHEMATIC, TIME COMPRESSED",
      marks: [
        { ...BASE_PT, label: "BASE", tone: "world" },
        { ...PIT_PT, label: "PIT", r: 4, tone: "crew" },
      ],
    },
    tokens: [
      { id: "t-r1", label: "RESCUE-1", tone: "robot", path: [{ atS: 1, ...BASE_PT }, { atS: 14.5, ...BASE_PT }, { atS: 26, x: 72, y: 19 }, { atS: 34, x: 72, y: 19 }, { atS: 44, ...BASE_PT }] },
      { id: "t-d1", label: "DRONE-1", tone: "robot", path: [{ atS: 1, x: BASE_PT.x - 6, y: BASE_PT.y - 5 }, { atS: 14.5, x: BASE_PT.x - 6, y: BASE_PT.y - 5 }, { atS: 22, x: 70, y: 8 }] },
      { id: "t-bot", label: "ROBOT", tone: "robot", path: [{ atS: 26, x: 72, y: 19 }, { atS: 30, ...PIT_PT }, { atS: 34, x: 72, y: 19 }] },
    ],
  },
  TOWING_IMAGE("r-img", 24, 36),
  { id: "r-l1", kind: "lower", icon: "rescue", fromS: 15, toS: 24, title: "Robots dispatched", detail: "rescue-1 with the rescue robot, drones on overwatch" },
  { id: "r-l2", kind: "lower", icon: "rescue", fromS: 26, toS: 34, title: "rescue-bot-1 reaches the astronaut", detail: "Hooks the harness and drags the crew member to rescue-1" },
  { id: "r-l3", kind: "lower", icon: "base", fromS: 35, toS: 45, title: "Convoy returns to base", detail: "Through the dust storm, drones grounded at their limit" },
];

const RESCUE_FLOW: OverlayItem[] = scaleTiming(RESCUE_FLOW_FULL, 0.6);
const VOICE_TO_DRONE: OverlayItem[] = scaleTiming(VOICE_TO_DRONE_FULL, 0.76);

/** Arc of the life-support pod over the map: sampled so the token follows a parabola. */
const podArc = (from: { x: number; y: number }, to: { x: number; y: number }, t0: number, t1: number, rise: number) =>
  Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    return { atS: t0 + (t1 - t0) * u, x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u - Math.sin(Math.PI * u) * rise };
  });

/** Slide shown before the cannon takes: what happens between the alarm and the launch. */
const LIFE_SUPPORT_FLOW: OverlayItem[] = [
  {
    id: "ls-graph",
    kind: "graph",
    fromS: 0.5,
    toS: 32,
    kicker: "LIFE-SUPPORT LAUNCH",
    title: "Supplies on the way before the rescue arrives",
    nodes: [
      { id: "health", label: "SUIT.HEALTH", detail: "Primary O2 falling: 41 %", x: FLOW_X, y: slot(0), tone: "agent", atS: 0.8 },
      { id: "base", label: "BASE", detail: "Decision: fire the cannon now", x: FLOW_X, y: slot(1), tone: "agent", atS: 3.2 },
      { id: "ballistic", label: "ROBOT.launcher-1", detail: "Ballistics: 45°, wind, 90 m/s limit", x: FLOW_X, y: slot(2), tone: "robot", atS: 5.6 },
      { id: "guard", label: "GUARDIAN", detail: "Impact outside the 15 m keep-out", x: FLOW_X, y: slot(3), tone: "guard", atS: 8 },
      { id: "fire", label: "CANNON FIRES", detail: "8 kg pod, parachute landing", x: FLOW_X, y: slot(4), tone: "world", atS: 10.4 },
    ],
    edges: chain(["health", "base", "ballistic", "guard", "fire"], [0.8, 3.2, 5.6, 8], { 3: "approved" }),
    map: {
      live: true,
      x: 59.5,
      y: 11,
      w: 40,
      h: 40,
      label: "TOP VIEW · SCHEMATIC",
      marks: [
        { x: 48, y: 36, label: "LAUNCHER-1", tone: "world" },
        { x: 78, y: 14, label: "ASTRONAUT", r: 6, tone: "crew" },
        { x: 66, y: 26, label: "IMPACT 32 m", tone: "robot" },
      ],
    },
    tokens: [{ id: "t-pod", label: "POD", tone: "robot", path: [{ atS: 11, x: 48, y: 36 }, ...podArc({ x: 48, y: 36 }, { x: 66, y: 26 }, 12, 20, 9), { atS: 26, x: 66, y: 26 }] }],
  },
  { id: "ls-health", kind: "voice", who: "agent", speaker: "SUIT.HEALTH", fromS: 1.2, toS: 9, text: "Oxygen 41 % and falling. Rescue is 66 seconds away." },
  { id: "ls-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 4, toS: 14, text: "Launching the life-support pod: oxygen, CO2 scrubber and battery." },
  { id: "ls-guard", kind: "voice", who: "guardian", speaker: "GUARDIAN", fromS: 9, toS: 18, text: "Pod lands 32 m from the crew, outside the 15 m keep-out. Approved." },
  { id: "ls-lower", kind: "lower", icon: "pod", fromS: 20, toS: 31, title: "Next: the cannon takes", detail: "The pod flies about 34 seconds and lands beside the crew member." },
];

/** Rescue dialogue in the extraction scenes, so the conversation stays readable while the robot works. */
export const RESCUE_DIALOGUE_S5: OverlayItem[] = [
  TOWING_IMAGE("s5-img", 8, 22),
  { id: "s5-guard", kind: "voice", who: "guardian", speaker: "GUARDIAN", fromS: 6.5, toS: 16, text: "rescue-1 stopped at the keep-out distance from the pit rim. Ramp open." },
  { id: "s5-bot", kind: "voice", who: "agent", speaker: "ROBOT.rescue-bot-1", fromS: 8.5, toS: 20, text: "Reversing out of the rear bay and driving to the pit rim." },
  { id: "s5-bot2", kind: "voice", who: "agent", speaker: "ROBOT.rescue-bot-1", fromS: 13.5, toS: 22, text: "Descending the access ramp into the pit." },
];

export const RESCUE_DIALOGUE_S6: OverlayItem[] = [
  TOWING_IMAGE("s6-img", 2, 30),
  { id: "s6-bot", kind: "voice", who: "agent", speaker: "ROBOT.rescue-bot-1", fromS: 3.5, toS: 12, text: "Reached the astronaut. Grabbing the suit harness." },
  { id: "s6-bot2", kind: "voice", who: "agent", speaker: "ROBOT.rescue-bot-1", fromS: 7, toS: 17, text: "Harness hooked. Arm raised for the drag." },
  { id: "s6-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 11, toS: 24, text: "Dragging the astronaut up the ramp to rescue-1. Dust opacity is rising." },
  { id: "s6-health", kind: "voice", who: "agent", speaker: "SUIT.HEALTH", fromS: 25.5, toS: 30, text: "The astronaut is in the bay of rescue-1. Second astronaut aboard." },
];

export const RESCUE_DIALOGUE_S7: OverlayItem[] = [
  { id: "s7-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 8, toS: 14, text: "rescue-1 is leaving for the base through the storm." },
];

/** Satellite alert: what the base sees when the storm front is reported. */
const STORM_ALERT: OverlayItem[] = [
  { id: "t1-alert", kind: "lower", icon: "storm", level: "alert", fromS: 0.5, toS: 15.5, title: "DUST STORM ALERT", detail: "Opacity rising: walking back to the base is NO-GO" },
  { id: "t1-weather", kind: "voice", who: "agent", speaker: "WEATHER-RAD", fromS: 2.2, toS: 9, text: "Dust storm front reported. Opacity is rising." },
  { id: "t1-base", kind: "voice", who: "agent", speaker: "BASE", fromS: 4.2, toS: 12, text: "Decision: rescue the astronaut with rescue-1 and the rescue robot." },
  { id: "t1-guard", kind: "voice", who: "guardian", speaker: "GUARDIAN", fromS: 6.2, toS: 14, text: "rescue-1 dispatch allowed. Slope and keep-out checked." },
  { id: "t1-drones", kind: "voice", who: "agent", speaker: "GUARDIAN", fromS: 10.2, toS: 16, text: "Drones launched for overwatch, 25 m or more from the crew." },
  { id: "t1-coords", kind: "coords", fromS: 3, toS: 15.5, ...DIAZ_CANO },
  { id: "t1-forecast", kind: "forecast", fromS: 4.5, toS: 15.5, kicker: "STORM NOWCASTER", title: "Dust opacity forecast, next 3 sols", caption: "Median, 80 % band and the storm level; the verdict applies the EVA limits." },
];

/** In the storm: the helmet view of the astronaut who walks to the rescue vehicle. */
const STORM_HELMET: OverlayItem[] = [
  { id: "t2-visor", kind: "visor", fromS: 0, toS: 9, label: "" },
  { id: "t2-lower", kind: "lower", icon: "storm", level: "alert", fromS: 0.5, toS: 17.5, title: "DUST STORM AT FULL STRENGTH", detail: "Drones grounded. Floodlights on at rescue-1." },
  { id: "t2-crew", kind: "voice", who: "crew", speaker: "ASTRONAUT · HELMET", fromS: 1, toS: 9, text: "Visibility is very low. Walking to rescue-1 by its floodlights, with the second astronaut beside me." },
  { id: "t2-bot", kind: "voice", who: "agent", speaker: "ROBOT.rescue-bot-1", fromS: 9.5, toS: 17.5, text: "Towing the astronaut to the bay. Wind and dust are rising." },
];

const mlCard = (id: string, n: number, title: string, subtitle: string, bullets: string[], note: string, icon: string, bulletIcons: string[]): OverlayItem[] => [
  { id, kind: "card", side: "left", fromS: 0.5, toS: 24, kicker: `ML MODEL ${n} OF 3`, icon, title, subtitle, bullets, bulletIcons, note },
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
  "waterdrop",
  ["map", "chip", "chart"],
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
  "storm",
  ["chart", "clock", "check"],
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
  "vein",
  ["eye", "camera", "chart"],
);

/** The three custom ML models on one slide (replaces the three single-model slides in the deck). */
const ML_MODELS: OverlayItem[] = [
  {
    id: "ml-all",
    kind: "grid",
    cols: 3,
    fromS: 0.5,
    toS: 32,
    kicker: "3 CUSTOM ML MODELS",
    title: "Trained on real NASA data",
    chips: [
      { icon: "waterdrop", label: "Hydration Prospector", detail: "Where to look for water: 1,567 Curiosity DAN stops plus CRISM, THEMIS and CTX. Spearman 0.58, error 0.37 against 0.49 for the baseline. A relative H/OH indicator, not percent water." },
      { icon: "storm", label: "Storm Nowcaster", detail: "Is it safe to go outside: dust opacity 1 to 3 sols ahead from REMS pressure tides; the Mars Year 34 storm held out. Spearman 0.77 to 0.80. A trend indicator: it does not beat persistence on one station." },
      { icon: "vein", label: "Mineral Vein Detector", detail: "Where to drill: DINOv2-small features flag bright veins in 117 audited Curiosity photos. ROC-AUC 0.85, precision 0.79, recall 0.66. A visual candidate only: minerals need ChemCam or CheMin." },
    ],
  },
];

const CLOSING: OverlayItem[] = [
  PATCH("closing-patch", 0.3, 14),
  SUPPORTERS("closing-logos", 1.5, 14),
  {
    id: "closing",
    kind: "card",
    side: "center",
    fromS: 0.5,
    toS: 14,
    kicker: "TANGO HORIZON",
    icon: "rocket",
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
    durationS: 14,
    layer: "optical",
    segments: [
      { fromS: 0, kind: "orbit", target: "launch-site", radius: 260, height: 60, startRad: -1.2, speed: 0.07, lookAboveM: 90 },
      { fromS: 7, kind: "aerial", target: "launch-site", offset: { x: 150, y: 25, z: -190 }, lookAboveM: 110 },
    ],
    overlay: COVER,
  },
  {
    id: "P0",
    nameKey: "scene.p0",
    startS: 20,
    durationS: 11,
    segments: [
      { fromS: 0, kind: "orbit", target: "base", radius: 95, height: 60, speed: 0.12, lookAboveM: 2 },
      { fromS: 5.5, kind: "aerial", target: "rover-1", offset: { x: 16, y: 5, z: 14 }, lookAboveM: 1.2 },
    ],
    overlay: PROBLEM,
  },
  {
    id: "A1",
    nameKey: "scene.a1",
    startS: 0,
    durationS: 28,
    segments: [
      { fromS: 0, kind: "orbit", target: "base", radius: 120, height: 70, speed: 0.06, lookAboveM: 2 },
      { fromS: 14, kind: "aerial", target: "launch-site", offset: { x: 240, y: 40, z: -210 }, lookAboveM: 95 },
    ],
    overlay: ARCHITECTURE,
  },
  {
    id: "W1",
    nameKey: "scene.w1",
    pov: "1st",
    startS: 56,
    durationS: 38,
    segments: [
      // Point of view of the player astronaut at head height, looking at the drone as it takes off and flies away.
      { fromS: 0, kind: "aerial", target: "crew-1", offset: { x: 0, y: 1.6, z: 0 }, lookAt: "drone-1", lookAboveM: 0 },
      { fromS: 26, kind: "follow", target: "drone-1", offset: { x: 18, y: 7, z: 18 }, lookAboveM: 0 },
    ],
    overlay: VOICE_TO_DRONE,
  },
  {
    id: "K1",
    nameKey: "scene.k1",
    startS: 0,
    durationS: 30,
    segments: [{ fromS: 0, kind: "orbit", target: "base", radius: 130, height: 60, speed: 0.05, lookAboveM: 2 }],
    overlay: CAPABILITIES,
  },
  {
    id: "Q1",
    nameKey: "scene.q1",
    stormTau: STORM_TAU_FULL,
    startS: 0,
    durationS: 30,
    segments: [
      { fromS: 0, kind: "orbit", target: "rover-1", radius: 16, height: 5, speed: 0.12, lookAboveM: 1.2 },
      { fromS: 15, kind: "orbit", target: "base", radius: 90, height: 35, speed: 0.07, lookAboveM: 3 },
    ],
    overlay: PREDICTIVE_RAG,
  },
  {
    id: "U1",
    nameKey: "scene.u1",
    startS: 0,
    durationS: 48,
    showHud: true,
    pov: "1st",
    segments: [
      // Head height of the walking player, looking where the script points the gaze (crew-4, sky, rover, drone).
      { fromS: 0, kind: "aerial", target: "crew-1", offset: { x: 0, y: 1.55, z: 0 }, lookAt: "u1-gaze", lookAboveM: 0 },
    ],
    overlay: HELMET_TOUR,
  },
  {
    id: "G1",
    nameKey: "scene.g1",
    startS: 0,
    durationS: 37,
    segments: [
      { fromS: 0, kind: "orbit", target: "base", radius: 110, height: 55, speed: 0.05, lookAboveM: 2 },
      { fromS: 19, kind: "aerial", target: "rover-1", offset: { x: 18, y: 6, z: 16 }, lookAboveM: 1.2 },
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
    id: "O1",
    nameKey: "scene.o1",
    stormTau: STORM_TAU,
    startS: 48,
    durationS: 17,
    segments: [{ fromS: 0, kind: "orbit", target: ["base", "rescue-site"], radius: 900, height: 700, speed: 0.04 }],
    overlay: OPERATION_MAP,
  },
  {
    id: "V1",
    nameKey: "scene.v1",
    stormTau: STORM_TAU,
    startS: 55,
    durationS: 22,
    segments: [
      { fromS: 0, kind: "orbit", target: "crew-2", radius: 12, height: 3, speed: 0.2, lookAboveM: 1.2 },
      { fromS: 6, kind: "follow", target: "rescue-1", offset: { x: 12, y: 3.5, z: 11 }, lookAboveM: 1.2 },
      { fromS: 14, kind: "follow", target: "drone-1", offset: { x: 9, y: 4, z: 11 }, lookAboveM: 0 },
    ],
    overlay: VOICE_RESCUE,
  },
  {
    id: "R1",
    nameKey: "scene.r1",
    stormTau: STORM_TAU,
    startS: 64,
    durationS: 29,
    segments: [{ fromS: 0, kind: "orbit", target: ["base", "rescue-site"], radius: 900, height: 700, speed: 0.04 }],
    overlay: RESCUE_FLOW,
  },
  {
    id: "L0",
    nameKey: "scene.l0",
    stormTau: STORM_TAU,
    startS: 72,
    durationS: 33,
    segments: [{ fromS: 0, kind: "orbit", target: "launcher-1", radius: 40, height: 14, speed: 0.08, lookAboveM: 3 }],
    overlay: LIFE_SUPPORT_FLOW,
  },
  {
    id: "L1",
    nameKey: "scene.l1",
    stormTau: STORM_TAU,
    startS: 72,
    durationS: 26,
    segments: [
      { fromS: 0, kind: "aerial", target: "launcher-1", offset: { x: -12, y: 5, z: 16 }, lookAboveM: 3 },
      { fromS: 4.4, kind: "follow", target: "pod", offset: { x: 30, y: 10, z: 26 }, lookAboveM: 0 },
      { fromS: 16, kind: "aerial", target: "pod", offset: { x: 9, y: 4, z: 10 }, lookAboveM: 1 },
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
    id: "ML1",
    nameKey: "scene.ml1",
    stormTau: STORM_TAU_FULL,
    startS: 20,
    durationS: 33,
    layer: "hydration",
    segments: [{ fromS: 0, kind: "orbit", target: "base", radius: 520, height: 420, speed: 0.03, lookAboveM: 0 }],
    overlay: ML_MODELS,
  },
  {
    id: "T1",
    nameKey: "scene.t1",
    startS: 58,
    durationS: 16,
    layer: "optical",
    segments: [
      // Satellite-style top view: base, then the pit, then both at once.
      { fromS: 0, kind: "aerial", target: "base", offset: { x: 0, y: 190, z: 2 }, lookAboveM: 0 },
      { fromS: 5, kind: "aerial", target: "rescue-site", offset: { x: 0, y: 190, z: 2 }, lookAboveM: 0 },
      { fromS: 10, kind: "aerial", target: ["base", "rescue-site"], offset: { x: 0, y: 1250, z: 2 }, lookAboveM: 0 },
    ],
    overlay: STORM_ALERT,
  },
  {
    id: "T2",
    nameKey: "scene.t2",
    pov: "1st",
    startS: 226,
    stormTau: STORM_TAU_FULL,
    durationS: 18,
    segments: [
      // Helmet view looking at rescue-1, then a side view of the astronaut and the robot towing the casualty.
      { fromS: 0, kind: "aerial", target: "crew-2", offset: { x: 0, y: 1.6, z: 0 }, lookAt: "rescue-1", lookAboveM: 1.2 },
      { fromS: 9, kind: "follow", target: ["crew-2", "rescue-bot-1"], offset: { x: 9, y: 3, z: 9 }, lookAboveM: 1 },
    ],
    overlay: STORM_HELMET,
  },
  {
    id: "E1",
    nameKey: "scene.e1",
    stormTau: STORM_TAU_FULL,
    startS: 0,
    durationS: 15,
    segments: [{ fromS: 0, kind: "aerial", target: "launch-site", offset: { x: 150, y: 25, z: -190 }, lookAboveM: 110 }],
    overlay: CLOSING,
  },
];

/** Scenes of the explained video in play order; the older takes stay selectable one by one. */
export const DECK_ORDER: readonly string[] = [
  // Opening
  "C0", "K1", "P0",
  // The world: the base and where everyone is (the rocket pad is only the cover, `C0`)
  "S1", "S2",
  // The AI team, direct control and voice orders
  "A1", "U1", "W1", "G1", "F1",
  // The rescue, from the accident to the extraction
  "S3", "H1", "V1", "T1", "O1", "S4", "R1", "L0", "L1", "T2", "S5", "S6", "S7",
  // Models and standards, then the close
  "Q1", "M1", "M2", "M3", "ML1", "E1",
];
