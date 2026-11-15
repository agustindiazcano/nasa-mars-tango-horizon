import { describe, expect, it } from "vitest";
import { CREW_ROSTER, findCrew, findCrewInText, initialCrewSnapshots } from "../../types/crew.js";

describe("crew roster", () => {
  it("has the four team members, two at the base and two on the expedition", () => {
    expect(CREW_ROSTER.map((m) => m.name).sort()).toEqual(["DIAZ-CANO", "SALERNO", "SOTELO", "YACONIS"]);
    expect(CREW_ROSTER.filter((m) => m.assignment === "base")).toHaveLength(2);
    expect(CREW_ROSTER.filter((m) => m.assignment === "science_expedition")).toHaveLength(2);
    expect(new Set(CREW_ROSTER.map((m) => m.id)).size).toBe(4);
  });

  it("resolves names ignoring accents, case and separators", () => {
    expect(findCrew("díaz cano")?.name).toBe("DIAZ-CANO");
    expect(findCrew("Diaz-Cano")?.name).toBe("DIAZ-CANO");
    expect(findCrew("DIAZ")?.name).toBe("DIAZ-CANO");
    expect(findCrew("salerno")?.name).toBe("SALERNO");
    expect(findCrew("crew-3")?.name).toBe("YACONIS");
    expect(findCrew("nobody")).toBeNull();
    expect(findCrew("")).toBeNull();
  });

  it("finds names inside a sentence in several languages", () => {
    expect(findCrewInText("¿Dónde está Sotelo?").map((m) => m.name)).toEqual(["SOTELO"]);
    expect(findCrewInText("status of Yaconis and Salerno").map((m) => m.name)).toEqual(["SALERNO", "YACONIS"]);
    expect(findCrewInText("Wo ist Díaz-Cano gerade").map((m) => m.name)).toEqual(["DIAZ-CANO"]);
    expect(findCrewInText("who is on the expedition")).toEqual([]);
  });

  it("builds initial snapshots: base crew near the habitat, expedition crew in rover-1", () => {
    const snaps = initialCrewSnapshots({ x: 100, z: 200 }, { x: 70, z: 224 });
    expect(snaps).toHaveLength(4);
    const sotelo = snaps.find((s) => s.name === "SOTELO")!;
    expect(sotelo.location).toBe("in_rover");
    expect(sotelo.unit_id).toBe("rover-1");
    expect(sotelo.x).toBe(70);
    expect(snaps.filter((s) => s.location === "base")).toHaveLength(2);
    expect(snaps.every((s) => s.status === "nominal")).toBe(true);
  });
});
