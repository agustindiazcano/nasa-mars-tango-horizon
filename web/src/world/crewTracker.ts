import type { CrewSnapshot } from "@th/shared";

export interface TrackedPoint {
  x: number;
  z: number;
}

export interface TrackedUnit extends TrackedPoint {
  id: string;
}

/**
 * Keeps crew positions in step with what carries them: the player astronaut (`crew-1`) follows the controller,
 * and anyone riding a fleet unit follows that unit. Everyone else keeps their last position.
 * A scenario that sets crew positions itself replaces the result of this function.
 */
export function trackCrew(crew: readonly CrewSnapshot[], player: TrackedPoint, fleet: readonly TrackedUnit[]): CrewSnapshot[] {
  return crew.map((c) => {
    if (c.id === "crew-1" && c.status !== "incapacitated") return { ...c, x: player.x, z: player.z };
    if (c.unit_id) {
      const u = fleet.find((f) => f.id === c.unit_id);
      if (u) return { ...c, x: u.x, z: u.z };
    }
    return c;
  });
}

/** Distance in metres between a crew member and a point (for example the base). */
export function crewDistanceM(c: TrackedPoint, to: TrackedPoint): number {
  return Math.hypot(c.x - to.x, c.z - to.z);
}
