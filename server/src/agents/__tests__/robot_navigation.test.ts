import { describe, expect, it, vi } from "vitest";
import type { MissionContext } from "../types.js";

vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => false,
  chat: vi.fn(),
}));

import { MAX_SLOPE, review, ruleCheck } from "../guardian.js";
import { shouldEscalateFast } from "../hierarchy.js";
import { offlineReply } from "../offline.js";
import { missionScope, startMcpServers } from "../tools/mcp.js";
import { TOOLS } from "../tools/registry.js";
import { nearestSafePoint, slopeAt } from "../tools/terrainData.js";

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    lang: "en",
    met_s: 600,
    astronaut: { x: 28, z: 36, body_kg: 78, load_kg: 65, speed: 0 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2, o2_reserve_kg: 0.5 },
    leak_diameter_m: 0,
    env: {
      pressure_pa: 750,
      air_temp_k: 220,
      tau: 0.48,
      wind_ms: 5.2,
      dose_rate_ugy_h: 9.8,
    },
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: -22, z: 18, battery: 0.94, busy: false },
      { id: "rover-2", kind: "rover_science", x: 62, z: 48, battery: 0.94, busy: false },
      { id: "rescue-1", kind: "rescue", x: -18, z: 12, battery: 0.94, busy: false },
      { id: "drone-1", kind: "drone", x: 40, z: -30, battery: 0.94, busy: false },
      { id: "drone-2", kind: "drone", x: -60, z: 55, battery: 0.94, busy: false },
      { id: "manip-1", kind: "manipulator", x: 34, z: 42, battery: 0.94, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

function findSteepPointWithNearbySafe(maxSlope = 20): { x: number; z: number } {
  for (let x = -1200; x <= 1200; x += 20) {
    for (let z = -1200; z <= 1200; z += 20) {
      if (slopeAt(x, z) > maxSlope) {
        const safe = nearestSafePoint(x, z, maxSlope);
        if (safe.slope_deg <= maxSlope && Math.hypot(safe.x - x, safe.z - z) <= 25) {
          return { x, z };
        }
      }
    }
  }
  return { x: 500, z: 500 };
}

describe("Autonomous robot navigation, ESCALATE_FAST_RE, MCP & GUARDIAN", () => {
  it("escalates English and Spanish robot approach commands via shouldEscalateFast", () => {
    const ctx = makeContext();
    const orders = [
      "rover one, go to my position",
      "drone one go to my position",
      "rover 1 ven a mi posicion",
      "drone veni",
      "come here",
      "ven acá",
      "acércate",
    ];
    for (const order of orders) {
      expect(shouldEscalateFast(order, ctx), order).toBe(true);
    }
  });

  it("dispatches rover-1 and drone-1 to astronaut coordinates on approach orders in offlineReply", async () => {
    const ctxEn = makeContext({ lang: "en" });
    const roverOrder = await offlineReply("rover one, go to my position", ctxEn);
    const roverDispatch = roverOrder.actions.find((a) => a.type === "dispatch");
    expect(roverDispatch).toBeDefined();
    expect(roverDispatch?.verdict?.decision).toBe("allow");
    expect(roverDispatch?.args.unit_id).toBe("rover-1");
    expect(Math.hypot(Number(roverDispatch?.args.x) - ctxEn.astronaut.x, Number(roverDispatch?.args.z) - ctxEn.astronaut.z)).toBeLessThanOrEqual(25);

    const droneOrder = await offlineReply("drone one go to my position", ctxEn);
    const droneDispatch = droneOrder.actions.find((a) => a.type === "dispatch");
    expect(droneDispatch).toBeDefined();
    expect(droneDispatch?.verdict?.decision).toBe("allow");
    expect(droneDispatch?.args.unit_id).toBe("drone-1");
    expect(droneDispatch?.args.x).toBe(28);
    expect(droneDispatch?.args.z).toBe(36);

    const ctxEs = makeContext({ lang: "es" });
    const roverEs = await offlineReply("rover 1 ven a mi posicion", ctxEs);
    const roverEsDispatch = roverEs.actions.find((a) => a.type === "dispatch");
    expect(roverEsDispatch?.verdict?.decision).toBe("allow");
    expect(roverEsDispatch?.args.unit_id).toBe("rover-1");
    expect(roverEsDispatch?.args.x).toBe(28);
    expect(roverEsDispatch?.args.z).toBe(36);

    const droneEs = await offlineReply("drone veni", ctxEs);
    const droneEsDispatch = droneEs.actions.find((a) => a.type === "dispatch");
    expect(droneEsDispatch?.verdict?.decision).toBe("allow");
    expect(droneEsDispatch?.args.unit_id).toBe("drone-1");
    expect(droneEsDispatch?.args.x).toBe(28);
    expect(droneEsDispatch?.args.z).toBe(36);
  });

  it("handles follow, overwatch, rescue-1, and manip-1 navigation orders cleanly", async () => {
    const ctx = makeContext();

    const follow = await offlineReply("rover 1 follow me", ctx);
    const followAct = follow.actions.find((a) => a.type === "unit_action");
    expect(followAct?.verdict?.decision).toBe("allow");
    expect(followAct?.args).toMatchObject({ unit_id: "rover-1", action: "follow_astronaut" });

    const overwatch = await offlineReply("drone 1 overwatch", ctx);
    const owAct = overwatch.actions.find((a) => a.type === "unit_action");
    expect(owAct?.verdict?.decision).toBe("allow");
    expect(owAct?.args).toMatchObject({ unit_id: "drone-1", action: "hover_overwatch" });

    const rescueNav = await offlineReply("rescue 1 go to my position", ctx);
    expect(rescueNav.actions.some((a) => a.type === "launch_pod")).toBe(false);
    const rescueDispatch = rescueNav.actions.find((a) => a.type === "dispatch");
    expect(rescueDispatch?.verdict?.decision).toBe("allow");
    expect(rescueDispatch?.args.unit_id).toBe("rescue-1");

    const manipNav = await offlineReply("manip 1 go to my position", ctx);
    expect(manipNav.actions.some((a) => a.type === "arm_skill")).toBe(false);
    const manipDispatch = manipNav.actions.find((a) => a.type === "dispatch");
    expect(manipDispatch?.verdict?.decision).toBe("allow");
    expect(manipDispatch?.args.unit_id).toBe("manip-1");
  });

  it("resolves a slope-safe stand-off when astronaut stands on steep terrain while keeping GUARDIAN strict on explicit hazards", async () => {
    await startMcpServers();
    const steep = findSteepPointWithNearbySafe(MAX_SLOPE.rover_crew);
    const steepCtx = makeContext({
      lang: "es",
      astronaut: { x: steep.x, z: steep.z, body_kg: 78, load_kg: 65, speed: 0 },
    });

    // Offline rover order resolves to a nearby safe stand-off and passes GUARDIAN
    const offlineRover = await offlineReply("rover 1 ven a mi posicion", steepCtx);
    const offDisp = offlineRover.actions.find((a) => a.type === "dispatch");
    expect(offDisp?.verdict?.decision).toBe("allow");
    expect(slopeAt(Number(offDisp?.args.x), Number(offDisp?.args.z))).toBeLessThanOrEqual(MAX_SLOPE.rover_crew);

    // MCP dispatch tool targeting astronaut snaps to safe stand-off within 25 m and passes GUARDIAN
    const dispatchTool = TOOLS.find((t) => t.name === "dispatch")!;
    const proposed = await missionScope.run({ ctx: steepCtx, caller: "ROBOT.rover-1" }, () =>
      dispatchTool.run({ unit_id: "rover-1", x: steep.x, z: steep.z, task: "goto" }, steepCtx, "ROBOT.rover-1"),
    );
    const mcpVerdict = await review(proposed as any, steepCtx, "rover 1 ven a mi posicion", []);
    expect(mcpVerdict.decision).toBe("allow");
    expect(slopeAt((proposed as any).args.x, (proposed as any).args.z)).toBeLessThanOrEqual(MAX_SLOPE.rover_crew);

    // Drones ignore ground slope and target exact astronaut coords
    const offlineDrone = await offlineReply("drone one go to my position", steepCtx);
    const droneDisp = offlineDrone.actions.find((a) => a.type === "dispatch");
    expect(droneDisp?.verdict?.decision).toBe("allow");
    expect(droneDisp?.args.x).toBe(steep.x);
    expect(droneDisp?.args.z).toBe(steep.z);

    // Explicit hazardous coordinates away from astronaut are strictly denied by GUARDIAN
    const farCtx = makeContext({ astronaut: { x: 0, z: 0, body_kg: 78, load_kg: 65, speed: 0 } });
    const hazardVerdict = ruleCheck(
      { type: "dispatch", args: { unit_id: "rover-1", x: 500, z: 500, task: "goto" }, proposedBy: "BASE" },
      farCtx,
    );
    expect(hazardVerdict?.decision).toBe("deny");
    expect(hazardVerdict?.reasonKey).toBe("guard.slope");

    // Aircraft grounded during dust storm (tau >= 1.8)
    const stormCtx = makeContext({ env: { ...farCtx.env, tau: 2.0 } });
    const grounded = ruleCheck(
      { type: "dispatch", args: { unit_id: "drone-1", x: 0, z: 0, task: "goto" }, proposedBy: "BASE" },
      stormCtx,
    );
    expect(grounded?.decision).toBe("deny");
    expect(grounded?.reason).toMatch(/aircraft grounding limit/i);
  });
});
