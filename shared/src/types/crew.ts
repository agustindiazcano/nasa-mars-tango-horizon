/**
 * Crew roster. The four astronauts carry the surnames of the team members; every part of the system
 * (HUD, minimap, MissionContext, agent tools, voice) refers to them by these callsigns, never by index.
 */

export type CrewId = "crew-1" | "crew-2" | "crew-3" | "crew-4";

/** Callsigns shown in the HUD and spoken by the AI orchestrator. */
export type CrewName = "SOTELO" | "YACONIS" | "SALERNO" | "DIAZ-CANO";

/** Mission assignment: the two at the base, the two on the science expedition. */
export type CrewAssignment = "base" | "science_expedition";

/** Where a crew member is right now. */
export type CrewLocation = "base" | "traverse" | "in_pit" | "rescue_vehicle" | "in_rover";

export type CrewStatus = "nominal" | "incapacitated" | "evacuating" | "recovering";

export interface CrewMember {
  id: CrewId;
  name: CrewName;
  /** Default assignment before any scenario moves them. */
  assignment: CrewAssignment;
  /** i18n key of the on-mission role. */
  roleKey: string;
}

/**
 * Default roster. SOTELO is the player-controlled astronaut at the base; YACONIS waits at the base;
 * SALERNO (driver) and DIAZ-CANO (geologist) are on the science expedition. Change the casting here only.
 */
export const CREW_ROSTER: readonly CrewMember[] = [
  { id: "crew-1", name: "SOTELO", assignment: "base", roleKey: "crew.role.eva_lead" },
  { id: "crew-4", name: "YACONIS", assignment: "base", roleKey: "crew.role.base_ops" },
  { id: "crew-2", name: "SALERNO", assignment: "science_expedition", roleKey: "crew.role.driver" },
  { id: "crew-3", name: "DIAZ-CANO", assignment: "science_expedition", roleKey: "crew.role.geologist" },
];

/** Live state of one crew member (positions in world metres, same frame as `astronaut` and `fleet`). */
export interface CrewSnapshot {
  id: CrewId;
  name: CrewName;
  assignment: CrewAssignment;
  x: number;
  z: number;
  location: CrewLocation;
  status: CrewStatus;
  /** Fleet unit id the crew member is riding in, when any. */
  unit_id?: string;
}

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const ALIASES: Record<CrewName, string[]> = {
  SOTELO: ["sotelo"],
  YACONIS: ["yaconis", "yaconi", "yakonis"],
  SALERNO: ["salerno"],
  "DIAZ-CANO": ["diazcano", "diaz", "cano"],
};

/**
 * Resolves a spoken or typed name ("díaz cano", "Sotelo", "crew-3") to a crew member.
 * Accent, case and separator insensitive. Returns null when nothing matches.
 */
export function findCrew(query: string): CrewMember | null {
  const q = strip(query);
  if (!q) return null;
  for (const m of CREW_ROSTER) {
    if (strip(m.id) === q) return m;
    if (ALIASES[m.name].some((a) => a === q)) return m;
  }
  return null;
}

/** Finds every crew member named inside a longer sentence. Order follows the roster. */
export function findCrewInText(text: string): CrewMember[] {
  const t = strip(text);
  return CREW_ROSTER.filter((m) => ALIASES[m.name].some((a) => a.length >= 5 && t.includes(a)));
}

/** Initial snapshots before a scenario drives positions (base crew near the habitat, expedition in `rover-1`). */
export function initialCrewSnapshots(base: { x: number; z: number }, rover: { x: number; z: number }): CrewSnapshot[] {
  const at: Record<CrewId, { x: number; z: number; location: CrewLocation; unit_id?: string }> = {
    "crew-1": { x: base.x + 28, z: base.z + 36, location: "base" },
    "crew-4": { x: base.x - 12, z: base.z + 8, location: "base" },
    "crew-2": { x: rover.x, z: rover.z, location: "in_rover", unit_id: "rover-1" },
    "crew-3": { x: rover.x, z: rover.z, location: "in_rover", unit_id: "rover-1" },
  };
  return CREW_ROSTER.map((m) => ({
    id: m.id,
    name: m.name,
    assignment: m.assignment,
    status: "nominal" as const,
    ...at[m.id],
  }));
}
