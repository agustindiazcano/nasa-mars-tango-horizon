/**
 * Line-art icon set for the slides (24 x 24 grid, stroke only, `currentColor`).
 * Every icon is a few simple strokes so it reads at 20 px and animates as one piece.
 * The planned list per slide lives in `docs/slides/ICON_LIST.md`.
 */

const P = (d: string): string => `<path d="${d}"/>`;
const C = (cx: number, cy: number, r: number): string => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const L = (x1: number, y1: number, x2: number, y2: number): string => `<path d="M${x1} ${y1}L${x2} ${y2}"/>`;

export const ICONS = {
  // Crew and suit
  astronaut: C(12, 9, 5.5) + P("M8.5 8.5h7v2.6a3.5 3.5 0 0 1-7 0z") + P("M5 21v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3") + L(12, 14.5, 12, 18),
  helmet: P("M12 3a8 8 0 0 0-8 8v4a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5v-4a8 8 0 0 0-8-8z") + P("M7.5 10.5h9v3a4.5 4.5 0 0 1-9 0z"),
  heart: P("M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z") + P("M6 12h3l1.5-3 2 5 1.5-2H18"),
  oxygen: C(9, 12, 5) + P("M16 13.5h3.5L16 18h3.5"),
  pressure: C(12, 12, 8) + L(12, 12, 16, 8.5) + P("M12 4v2M4 12h2M20 12h-2"),
  battery: P("M4 8h14v8H4z") + P("M18 10.5h2v3h-2") + P("M10.5 9.5l-2 3h3l-2 2.5"),
  thermometer: P("M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z") + L(12, 8, 12, 15),
  lungs: P("M12 4v9M12 8c-3 0-6 4-6 9 0 2 1 3 3 3 2 0 3-1 3-3zM12 8c3 0 6 4 6 9 0 2-1 3-3 3-2 0-3-1-3-3z"),
  dna: P("M8 3c0 6 8 6 8 12s-8 6-8 6M16 3c0 6-8 6-8 12s8 6 8 6M9 7h6M9 17h6"),
  // Robots and vehicles
  drone: P("M12 11v3M8 11h8l1.5 3h-11zM3 8h6M15 8h6M6 8V6M18 8V6") + C(12, 16, 1.2),
  rover: P("M5 11h14l2 4H3zM8 11V8h8v3M12 5v3") + C(7, 18, 2) + C(17, 18, 2) + C(12, 18, 2),
  roverArm: P("M3 18h12l1 3H2zM6 18v-3h6v3") + P("M9 15l1-6 5-4 3 2") + C(18, 7, 1.5) + C(5, 20, 1.2) + C(12, 20, 1.2),
  rescue: P("M3 13h15l3 4H3zM6 13V9h8v4M10 9V6M8 7.5h4") + C(7, 19, 1.8) + C(16, 19, 1.8),
  robot: P("M7 8h10v9H7z") + P("M12 8V5M10.5 5h3M4 12h3M17 12h3") + C(10, 12, 0.9) + C(14, 12, 0.9) + P("M9.5 15h5"),
  cannon: P("M4 17l9-9 4 4-9 9z") + P("M14.5 5.5l2-2 4 4-2 2") + C(5, 19, 2),
  pod: P("M12 3c3 2 4.5 5 4.5 9v4h-9v-4c0-4 1.5-7 4.5-9z") + C(12, 10, 1.6) + P("M7.5 16l-2 3M16.5 16l2 3M10 19h4"),
  parachute: P("M3 11a9 9 0 0 1 18 0c-1.5-1-3-1-4.5 0-1.5-1-3-1-4.5 0-1.5-1-3-1-4.5 0-1.5-1-3-1-4.5 0z") + P("M5 11l7 9M12 11v9M19 11l-7 9"),
  base: P("M3 19h18M5 19v-5a7 7 0 0 1 14 0v5") + P("M10 19v-4h4v4") + L(12, 7, 12, 4),
  rocket: P("M12 3c3 2.5 4.5 6 4.5 10l-2 3h-5l-2-3c0-4 1.5-7.5 4.5-10z") + C(12, 10, 1.6) + P("M9 16l-3 3 1 2 3-2M15 16l3 3-1 2-3-2"),
  // Environment
  storm: P("M4 12a4 4 0 0 1 4-4h.5a5 5 0 0 1 9 1.5A3.5 3.5 0 0 1 17 16H6a3 3 0 0 1-2-4z") + P("M7 19h6M10 22h6"),
  wind: P("M3 9h10a2.5 2.5 0 1 0-2.5-2.5M3 14h14a2.5 2.5 0 1 1-2.5 2.5M3 18h6"),
  sun: C(12, 12, 4) + P("M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"),
  radiation: C(12, 12, 1.6) + P("M12 10.4L8.2 4a9 9 0 0 1 7.6 0zM13.4 12.8l3.8 6.6a9 9 0 0 1-7.6-.1l3.8-6.5zM10.6 12.8L6.8 19.4A9 9 0 0 1 3 12.6l7.6.2z"),
  planet: C(12, 12, 6) + P("M3 15c2 2 11-1 15-6M7 8c-2 .5-3 1.5-2.5 2.5") + P("M16 14.5c1.5.5 3 0 3.5-1"),
  satellite: P("M9 9l3-3 3 3-3 3z") + P("M4 4l4 4M16 16l4 4M13 11l3 3-3 3-3-3z") + P("M4 15a5 5 0 0 1 5 5"),
  waterdrop: P("M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z") + P("M9 14.5a3 3 0 0 0 2.5 2.5"),
  rock: P("M3 18l3-8 5-3 6 2 4 5-2 4z") + P("M8 14l4-3 4 3M12 11v7"),
  vein: P("M4 18l6-3 3 2 7-9") + P("M6 8l5 2 2-4M13 17l2 3") + C(10, 15, 1),
  mountain: P("M2 19l6-10 4 6 3-4 7 8z") + P("M8 9l-1.5 2.5M15 11l1 1.5"),
  // Software and AI
  brain: P("M12 5a3 3 0 0 0-5.5 1.5A3.5 3.5 0 0 0 5 13a3.5 3.5 0 0 0 3 5.5A3 3 0 0 0 12 19zM12 5a3 3 0 0 1 5.5 1.5A3.5 3.5 0 0 1 19 13a3.5 3.5 0 0 1-3 5.5A3 3 0 0 1 12 19zM12 5v14"),
  chip: P("M7 7h10v10H7z") + P("M10 10h4v4h-4zM9 4v3M15 4v3M9 17v3M15 17v3M4 9h3M4 15h3M17 9h3M17 15h3"),
  mic: P("M9 4a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z") + P("M6 10a6 6 0 0 0 12 0M12 16v4M9 20h6"),
  voicewave: P("M4 12v0M8 8v8M12 4v16M16 8v8M20 12v0"),
  shield: P("M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z") + P("M8.5 12l2.5 2.5 4.5-5"),
  vote: P("M4 6h16v10H4zM9 16l-2 4h10l-2-4") + P("M8 11l2 2 4-4"),
  human: C(12, 7, 3) + P("M5 20v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2") + P("M17 4l2 2-2 2"),
  route: C(6, 18, 2) + C(18, 6, 2) + P("M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"),
  map: P("M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z") + P("M9 4v14M15 6v14"),
  eye: P("M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z") + C(12, 12, 3),
  camera: P("M4 8h4l1.5-2h5L16 8h4v11H4z") + C(12, 13, 3.5),
  book: P("M4 5h7v14H4zM13 5h7v14h-7z") + P("M6 9h3M6 12h3M15 9h3M15 12h3"),
  search: C(10.5, 10.5, 6) + L(15, 15, 20, 20) + P("M8 10.5h5"),
  phone: P("M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z") + C(12, 18, 0.8) + P("M10 6h4"),
  globe: C(12, 12, 9) + P("M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"),
  radio: P("M4 9h16v10H4z") + C(15, 14, 3) + P("M7 13h3M7 16h3M9 9l8-5"),
  offline: P("M3 3l18 18") + P("M8 8a7 7 0 0 0-4 6 4 4 0 0 0 4 4h9M17 17a4 4 0 0 0 0-8 6 6 0 0 0-8-3"),
  wrench: P("M20 6a4 4 0 0 1-5.5 5L7 18.5a1.8 1.8 0 0 1-2.5-2.5L12 8.5A4 4 0 0 1 17.5 4l-2.5 2.5 2 2z"),
  gear: C(12, 12, 3) + P("M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"),
  drill: P("M10 3h4v6h-4zM12 9v10M9.5 12l5 1M9.5 15l5 1M10.5 19l1.5 2 1.5-2") + L(7, 5, 17, 5),
  chart: P("M4 20V4M4 20h16") + P("M7 15l4-5 3 3 5-7"),
  clock: C(12, 12, 9) + P("M12 7v5l3 2"),
  alert: P("M12 3l10 18H2z") + L(12, 10, 12, 14) + C(12, 17.2, 0.4),
  check: C(12, 12, 9) + P("M8 12l3 3 5-6"),
  signal: P("M4 18v-2M9 18v-6M14 18V9M19 18V5"),
  flask: P("M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3") + P("M8 15h8"),
  layers: P("M12 3l9 5-9 5-9-5z") + P("M3 13l9 5 9-5M3 17.5l9 5 9-5"),
  target: C(12, 12, 8) + C(12, 12, 4) + C(12, 12, 0.6) + P("M12 2v3M12 19v3M2 12h3M19 12h3"),
  hud: P("M3 5h18v14H3z") + P("M6 8h5M6 11h3M15 8h3M6 16h12") + C(16, 12, 1.4),
} as const;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function isIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}

/** Inner markup of an icon on the 24 x 24 grid, or "" for an unknown name. */
export function iconInner(name: string | undefined): string {
  return name && isIconName(name) ? ICONS[name] : "";
}

/** Standalone inline icon for HTML overlays; stroke and size come from `.ov-ico` in `overlay.css`. */
export function iconSvg(name: string | undefined, cls = ""): string {
  const inner = iconInner(name);
  if (!inner) return "";
  return `<svg class="ov-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

/** Default icon of a speaker label such as `SUIT.HEALTH`, `ROBOT.drone-1` or `DIAZ-CANO · VOICE`. */
export function speakerIcon(speaker: string, who: "crew" | "agent" | "guardian"): IconName {
  const s = speaker.toUpperCase();
  if (s.includes("GUARDIAN")) return "shield";
  if (s.includes("VOICE-EXEC")) return "voicewave";
  if (s.includes("HEALTH")) return "heart";
  if (s.includes("WEATHER")) return "storm";
  if (s.includes("EVA")) return "route";
  if (s.includes("MAINT")) return "wrench";
  if (s.includes("SCIENCE")) return "flask";
  if (s.includes("DRONE")) return "drone";
  if (s.includes("RESCUE-BOT") || s.includes("RESCUE-1")) return "rescue";
  if (s.includes("MANIP") || s.includes("ROVER-3") || s.includes("HANDS")) return "roverArm";
  if (s.includes("LAUNCHER")) return "cannon";
  if (s.includes("ROVER")) return "rover";
  if (s.includes("ROBOT")) return "robot";
  if (s.startsWith("BASE")) return "base";
  return who === "crew" ? "astronaut" : "brain";
}
