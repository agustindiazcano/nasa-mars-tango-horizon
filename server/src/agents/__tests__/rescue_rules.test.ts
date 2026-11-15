import { describe, expect, it, vi } from "vitest";
import type { Action, MissionContext } from "../types.js";

vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => false,
  chat: vi.fn(),
}));

import { RESCUE_SITE } from "@th/shared";
import { review, ruleCheck } from "../guardian.js";
import { buildContext } from "../routes.js";
import { TOOLS } from "../tools/registry.js";
import { DRONE_CREW_STANDOFF_M } from "../unitCapabilities.js";

const P = RESCUE_SITE;

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    lang: "en",
    met_s: 600,
    astronaut: { x: 218, z: -470, body_kg: 78, load_kg: 65, speed: 0 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2, o2_reserve_kg: 0.5 },
    leak_diameter_m: 0,
    env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 10 },
    rescue_active: true,
    crew: [
      { id: "crew-1", x: 218, z: -470, status: "active" },
      { id: "crew-2", x: P.x + 5, z: P.z - 3, status: "active" },
      { id: "crew-3", x: P.x + 0.7, z: P.z + 0.7, status: "injured", in_pit: true },
      { id: "crew-4", x: 218, z: -488, status: "idle" },
    ],
    fleet: [
      { id: "rescue-1", kind: "rescue", x: P.x - 13, z: P.z - 12, battery: 0.9, busy: false },
      { id: "rescue-bot-1", kind: "rescue_robot", x: P.x - 13, z: P.z - 12, battery: 0.9, busy: false },
      { id: "drone-1", kind: "drone", x: 250, z: -520, battery: 0.85, busy: false },
      { id: "drone-2", kind: "drone", x: 150, z: -440, battery: 0.85, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

const act = (type: string, args: Record<string, unknown>, proposedBy = "BASE"): Action => ({ type, args, proposedBy });
const tool = (name: string) => TOOLS.find((t) => t.name === name)!;

describe("GUARDIAN drone standoff rule (rescue scenario)", () => {
  it("denies a drone dispatch within 25 m of any crew member", () => {
    const ctx = makeContext();
    const near = ruleCheck(act("dispatch", { unit_id: "drone-1", x: P.x + 5 + 10, z: P.z - 3, task: "goto" }), ctx);
    expect(near?.decision).toBe("deny");
    expect(near?.reason).toMatch(/crew-2.*standoff is 25 m/);
    const onTop = ruleCheck(act("dispatch", { unit_id: "drone-1", x: P.x, z: P.z, task: "goto" }), ctx);
    expect(onTop?.decision).toBe("deny");
  });

  it("allows a drone waypoint outside the standoff radius", () => {
    const ctx = makeContext();
    const ok = ruleCheck(act("dispatch", { unit_id: "drone-1", x: P.x + 34, z: P.z, task: "goto" }), ctx);
    expect(ok?.decision).not.toBe("deny");
  });

  it("applies to unit_action targets, implicit hover over the astronaut and the altitude band", () => {
    const ctx = makeContext();
    const photo = ruleCheck(act("unit_action", { unit_id: "drone-1", action: "photograph_area", x: P.x + 2, z: P.z }), ctx);
    expect(photo?.decision).toBe("deny");
    const hover = ruleCheck(act("unit_action", { unit_id: "drone-1", action: "hover_overwatch" }), ctx);
    expect(hover?.decision).toBe("deny");
    expect(hover?.reason).toMatch(/dispatch_overwatch/);
    const low = ruleCheck(act("unit_action", { unit_id: "drone-1", action: "takeoff", altitude_m: 14 }), ctx);
    expect(low?.decision).toBe("deny");
    expect(low?.reason).toMatch(/20-30 m/);
    const ok = ruleCheck(act("unit_action", { unit_id: "drone-1", action: "takeoff", altitude_m: 25 }), ctx);
    expect(ok?.decision).not.toBe("deny");
  });

  it("does not apply outside the rescue scenario", () => {
    const ctx = makeContext({ rescue_active: undefined });
    const v = ruleCheck(act("dispatch", { unit_id: "drone-1", x: 218, z: -470, task: "goto" }), ctx);
    expect(v?.decision).not.toBe("deny");
  });
});

describe("dispatch_overwatch tool and rule", () => {
  it("plans opposite-side orbits for drone-1 and drone-2 that satisfy the standoff and altitude band", async () => {
    const ctx = makeContext();
    const a1 = (await tool("dispatch_overwatch").run({ unit_id: "drone-1", target_id: "crew-3", radius_m: 34, altitude_m: 25 }, ctx, "BASE")) as Action;
    const a2 = (await tool("dispatch_overwatch").run({ unit_id: "drone-2", target_id: "crew-3", radius_m: 34, altitude_m: 25 }, ctx, "BASE")) as Action;
    expect(a1.type).toBe("dispatch_overwatch");
    for (const a of [a1, a2]) {
      for (const c of ctx.crew!) {
        const d = Math.hypot((a.args.x as number) - c.x, (a.args.z as number) - c.z);
        expect(d, `${a.args.unit_id} vs ${c.id}`).toBeGreaterThanOrEqual(DRONE_CREW_STANDOFF_M);
      }
      expect(ruleCheck(a, ctx)?.decision).not.toBe("deny");
    }
    expect(Math.hypot((a1.args.x as number) - (a2.args.x as number), (a1.args.z as number) - (a2.args.z as number))).toBeGreaterThan(60);
  });

  it("denies altitude, radius and crew-overlap violations", () => {
    const ctx = makeContext();
    const base = { unit_id: "drone-1", center_x: P.x, center_z: P.z, radius_m: 34, altitude_m: 25, x: P.x + 34, z: P.z };
    expect(ruleCheck(act("dispatch_overwatch", base), ctx)?.decision).not.toBe("deny");
    expect(ruleCheck(act("dispatch_overwatch", { ...base, altitude_m: 14 }), ctx)?.decision).toBe("deny");
    expect(ruleCheck(act("dispatch_overwatch", { ...base, altitude_m: 45 }), ctx)?.decision).toBe("deny");
    expect(ruleCheck(act("dispatch_overwatch", { ...base, radius_m: 10 }), ctx)?.decision).toBe("deny");
    expect(ruleCheck(act("dispatch_overwatch", { ...base, x: P.x + 10, z: P.z }), ctx)?.decision).toBe("deny");
    const orbitOverCrew = ruleCheck(act("dispatch_overwatch", { ...base, radius_m: 30, center_x: P.x + 28, x: P.x + 58 }), ctx);
    expect(orbitOverCrew?.decision).toBe("deny");
  });

  it("denies ground units and dust-grounded aircraft", () => {
    const ctx = makeContext();
    const base = { center_x: P.x, center_z: P.z, radius_m: 34, altitude_m: 25, x: P.x + 34, z: P.z };
    expect(ruleCheck(act("dispatch_overwatch", { ...base, unit_id: "rescue-1" }), ctx)?.decision).toBe("deny");
    const storm = makeContext({ env: { ...ctx.env, tau: 2.4 } });
    expect(ruleCheck(act("dispatch_overwatch", { ...base, unit_id: "drone-1" }), storm)?.decision).toBe("deny");
  });

  it("is allowed by review without an LLM hop when inside the limits", async () => {
    const ctx = makeContext();
    const planned = (await tool("dispatch_overwatch").run({ unit_id: "drone-2", target_id: "crew-3", radius_m: 34, altitude_m: 25 }, ctx, "BASE")) as Action;
    const v = await review(planned, ctx, "overwatch the casualty");
    expect(v.decision).toBe("allow");
  });
});

describe("get_crew_status and deploy_rescue_robot", () => {
  it("lists crew with status and the nearest unit", async () => {
    const ctx = makeContext();
    const out = (await tool("get_crew_status").run({ crew_id: "crew-3" }, ctx, "BASE")) as {
      rescue_active: boolean;
      crew: { id: string; status: string; in_pit: boolean; nearest_unit?: string }[];
    };
    expect(out.rescue_active).toBe(true);
    expect(out.crew).toHaveLength(1);
    expect(out.crew[0]).toMatchObject({ id: "crew-3", status: "injured", in_pit: true });
    expect(out.crew[0].nearest_unit).toBeTruthy();
    const all = (await tool("get_crew_status").run({}, ctx, "BASE")) as { crew: unknown[] };
    expect(all.crew).toHaveLength(4);
  });

  it("asks the human before the robot approaches the casualty", async () => {
    const ctx = makeContext();
    const proposed = (await tool("deploy_rescue_robot").run({ unit_id: "rescue-bot-1", target_id: "crew-3" }, ctx, "BASE")) as Action;
    expect(proposed.type).toBe("deploy_rescue_robot");
    expect(proposed.args).toMatchObject({ carrier_id: "rescue-1", target_id: "crew-3" });
    const v = ruleCheck(proposed, ctx);
    expect(v?.decision).toBe("ask_human");
    expect(v?.reason).toMatch(/in pit/);
  });

  it("denies a missing casualty, a wrong unit kind and a carrier that is too far", async () => {
    const ctx = makeContext();
    const ghost = (await tool("deploy_rescue_robot").run({ unit_id: "rescue-bot-1", target_id: "crew-9" }, ctx, "BASE")) as Action;
    expect(ruleCheck(ghost, ctx)?.decision).toBe("deny");
    const wrongKind = act("deploy_rescue_robot", { unit_id: "drone-1", carrier_id: "rescue-1", target_id: "crew-3", x: P.x, z: P.z });
    expect(ruleCheck(wrongKind, ctx)?.decision).toBe("deny");
    const far = makeContext({
      fleet: makeContext().fleet.map((u) => (u.id === "rescue-1" ? { ...u, x: 100, z: -300 } : u)),
    });
    const proposed = (await tool("deploy_rescue_robot").run({ unit_id: "rescue-bot-1", target_id: "crew-3" }, far, "BASE")) as Action;
    expect(ruleCheck(proposed, far)?.reason).toMatch(/robot deploys within 40 m/);
  });
});

describe("buildContext crew sanitizing", () => {
  it("keeps valid crew entries and the rescue flag, drops malformed ones", () => {
    const ctx = buildContext(
      {
        crew: [
          { id: "crew-1", x: 1, z: 2, status: "active" },
          { id: "crew-3", x: 5, z: 6, status: "injured", in_pit: true },
          { id: "evil", x: 1, z: 1 },
          { id: "crew-2", x: "NaN", z: 1 },
          { id: "crew-4", x: 3, z: 4, status: "bogus" },
        ],
        rescue_active: true,
      },
      "en",
    );
    expect(ctx.rescue_active).toBe(true);
    expect(ctx.crew).toEqual([
      { id: "crew-1", x: 1, z: 2, status: "active" },
      { id: "crew-3", x: 5, z: 6, status: "injured", in_pit: true },
      { id: "crew-4", x: 3, z: 4, status: "active" },
    ]);
  });
});
