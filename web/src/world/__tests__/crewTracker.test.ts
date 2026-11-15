import { describe, expect, it } from "vitest";
import { initialCrewSnapshots } from "@th/shared";
import { crewDistanceM, trackCrew } from "../crewTracker";

const start = initialCrewSnapshots({ x: 0, z: 0 }, { x: -30, z: 24 });

describe("trackCrew", () => {
  it("moves the player astronaut and the riders of rover-1, leaves the base crew in place", () => {
    const next = trackCrew(start, { x: 5, z: 6 }, [{ id: "rover-1", x: 100, z: 200 }]);
    const byName = (n: string) => next.find((c) => c.name === n)!;
    expect(byName("SOTELO")).toMatchObject({ x: 5, z: 6 });
    expect(byName("SALERNO")).toMatchObject({ x: 100, z: 200 });
    expect(byName("DIAZ-CANO")).toMatchObject({ x: 100, z: 200 });
    expect(byName("YACONIS")).toEqual(start.find((c) => c.name === "YACONIS"));
  });

  it("does not mutate its input and ignores unknown units", () => {
    const copy = JSON.parse(JSON.stringify(start));
    const next = trackCrew(start, { x: 1, z: 1 }, []);
    expect(start).toEqual(copy);
    expect(next.find((c) => c.name === "SALERNO")).toEqual(start.find((c) => c.name === "SALERNO"));
  });

  it("does not drag an incapacitated player astronaut", () => {
    const hurt = start.map((c) => (c.id === "crew-1" ? { ...c, status: "incapacitated" as const } : c));
    const next = trackCrew(hurt, { x: 9, z: 9 }, []);
    expect(next.find((c) => c.id === "crew-1")).toMatchObject({ x: start[0].x, z: start[0].z });
  });

  it("measures distance", () => {
    expect(crewDistanceM({ x: 3, z: 4 }, { x: 0, z: 0 })).toBe(5);
  });
});
