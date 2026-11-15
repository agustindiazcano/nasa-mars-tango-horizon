import { describe, expect, it } from "vitest";
import { BASE_ORIGIN, initialCrewSnapshots } from "@th/shared";
import { MissionStore } from "../state";

describe("MissionContext crew", () => {
  it("passes the four callsigns with positions rounded to 0.1 m", () => {
    const store = new MissionStore();
    store.crew = initialCrewSnapshots(BASE_ORIGIN, { x: 100.04, z: -20.06 });
    const ctx = store.toContext();
    expect(ctx.crew?.map((c) => c.name)).toEqual(["SOTELO", "YACONIS", "SALERNO", "DIAZ-CANO"]);
    expect(ctx.crew?.find((c) => c.name === "DIAZ-CANO")).toMatchObject({ x: 100, z: -20.1, location: "in_rover", status: "nominal" });
  });
});
