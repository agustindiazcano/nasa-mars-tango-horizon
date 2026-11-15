import { describe, expect, it } from "vitest";
import { MissionStore } from "../state";

describe("MissionContext crew positions", () => {
  it("includes the player astronaut as crew-1 followed by the scripted crew", () => {
    const store = new MissionStore();
    store.astronaut.x = 12.34;
    store.astronaut.z = -5.67;
    store.crew = [{ id: "crew-4", x: 218, z: -488, status: "idle" }];
    const ctx = store.toContext();
    expect(ctx.crew).toEqual([
      { id: "crew-1", x: 12.3, z: -5.7, status: "active" },
      { id: "crew-4", x: 218, z: -488, status: "idle" },
    ]);
  });
});
