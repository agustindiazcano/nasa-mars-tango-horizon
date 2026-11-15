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
    expect(findCrew("sotelo")?.name).toBe("SOTELO");
    expect(findCrew("Sotelo")?.name).toBe("SOTELO");
    expect(findCrew("DIAZ")?.name).toBe("DIAZ-CANO");
    expect(findCrew("yaconis")?.name).toBe("YACONIS");
    expect(findCrew("crew-3")?.name).toBe("DIAZ-CANO");
    expect(findCrew("nobody")).toBeNull();
    expect(findCrew("")).toBeNull();
  });

  it("finds names inside a sentence in several languages", () => {
    expect(findCrewInText("¿Dónde está Salerno?").map((m) => m.name)).toEqual(["SALERNO"]);
    expect(findCrewInText("status of Diaz-Cano and Yaconis").map((m) => m.name)).toEqual(["YACONIS", "DIAZ-CANO"]);
    expect(findCrewInText("Wo ist Sotelo gerade").map((m) => m.name)).toEqual(["SOTELO"]);
    expect(findCrewInText("who is on the expedition")).toEqual([]);
  });

  it("builds initial snapshots: base crew near the habitat, expedition crew in rover-1", () => {
    const snaps = initialCrewSnapshots({ x: 100, z: 200 }, { x: 70, z: 224 });
    expect(snaps).toHaveLength(4);
    const salerno = snaps.find((s) => s.name === "SALERNO")!;
    expect(salerno.location).toBe("in_rover");
    expect(salerno.unit_id).toBe("rover-1");
    expect(salerno.x).toBe(70);
    expect(snaps.filter((s) => s.location === "base")).toHaveLength(2);
    expect(snaps.every((s) => s.status === "nominal")).toBe(true);
  });
});
