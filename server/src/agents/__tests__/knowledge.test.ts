import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import type { MissionContext } from "@th/shared";
import { searchDocs, type DocChunk } from "../tools/knowledge.js";
import { ruleCheck } from "../guardian.js";
import { offlineReply } from "../offline.js";
import { TOOLS } from "../tools/registry.js";

function callTool(name: string, args: Record<string, unknown>, ctx: MissionContext, caller: string) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Missing tool ${name}`);
  return tool.run(args as never, ctx, caller);
}

function makeTestContext(): MissionContext {
  return {
    lang: "es",
    met_s: 1200,
    astronaut: { x: -600, z: -900, body_kg: 80, load_kg: 60, speed: 1.0 },
    suit: {
      heart_rate_bpm: 96,
      o2_pressure_psi: 810,
      o2_rate_psi_min: 1.0,
      o2_primary_kg: 0.72,
      o2_reserve_kg: 0.54,
      t_oxygen_sec: 14400,
      battery_pct: 82,
      t_battery_sec: 18000,
      suit_pressure_total_psi: 4.3,
      suit_pressure_pa: 29600,
      co2_mmhg: 2.1,
      fan_pri_rpm: 30000,
      temp_degf: 70,
      coolant_liquid_pressure_psi: 45,
      scrubber_a_co2_storage_pct: 22,
    },
    leak_diameter_m: 0,
    env: {
      pressure_pa: 760,
      air_temp_k: 245,
      tau: 0.6,
      wind_ms: 6.5,
      wind_dir_deg: 23,
      dose_rate_ugy_h: 22,
      cumulative_dose_ugy: 1400,
    },
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: 40, z: 30, battery: 0.88, busy: false },
      { id: "rover-2", kind: "rover_science", x: -80, z: 140, battery: 0.91, busy: false },
      { id: "drone-1", kind: "scout", x: 10, z: -20, battery: 0.75, busy: false },
    ],
    hud: { layer: "optical", panel: null },
  };
}

function assertValidCitations(results: DocChunk[], expectedMin = 1): void {
  expect(results.length).toBeGreaterThanOrEqual(expectedMin);
  for (const chunk of results) {
    expect(typeof chunk.doc).toBe("string");
    expect(chunk.doc.length).toBeGreaterThan(0);
    expect(Number.isInteger(chunk.page)).toBe(true);
    expect(chunk.page).toBeGreaterThanOrEqual(1);
    expect(typeof chunk.text).toBe("string");
    expect(chunk.text.length).toBeGreaterThan(20);
    expect(typeof chunk.score).toBe("number");
    expect(chunk.score!).toBeGreaterThan(0);
  }
}

describe("BM25 knowledge search (searchDocs)", () => {
  it("retrieves NASA-STD-3001 O2 partial pressure and hypoxia limits", () => {
    const results = searchDocs("O2 partial pressure hypoxia PIO2 limit", 3);
    assertValidCitations(results);
    const combined = results.map((r) => `${r.doc} ${r.text}`).join(" ");
    expect(combined).toMatch(/NASA-STD-3001/i);
    expect(combined).toMatch(/hypoxia|PIO2|PAO2|mmHg|kPa/i);
  });

  it("retrieves CO2 and hypercapnia limits from NASA-STD-3001 and OCHMO-TB-004", () => {
    const results = searchDocs("CO2 inspired partial pressure limits hypercapnia", 3);
    assertValidCitations(results);
    const docs = results.map((r) => r.doc).join(" ");
    expect(docs).toMatch(/NASA-STD-3001|OCHMO-TB-004/i);
    const texts = results.map((r) => r.text).join(" ");
    expect(texts).toMatch(/PICO2|ppCO2|hypercapnia|4\.0 mmHg|15\.0 mmHg/i);
  });

  it("retrieves radiation career effective dose and organ limits", () => {
    const results = searchDocs("radiation career effective dose limit 600 mSv BFO", 3);
    assertValidCitations(results);
    const combined = results.map((r) => `${r.doc} ${r.text}`).join(" ");
    expect(combined).toMatch(/NASA-STD-3001/i);
    expect(combined).toMatch(/600 mSv|ALARA|BFO|mGy-Eq/i);
  });

  it("retrieves spacesuit operating pressure and decompression sickness limits", () => {
    const results = searchDocs("suit pressure 29.6 kPa decompression sickness EVA", 3);
    assertValidCitations(results);
    const combined = results.map((r) => `${r.doc} ${r.text}`).join(" ");
    expect(combined).toMatch(/29\.6 kPa|4\.3 psia|40 kPa|55\.2 kPa/i);
    expect(combined).toMatch(/decompression|DCS|suit/i);
  });

  it("retrieves EVA medical care, AMCL, and MEDPRAT references", () => {
    const evaMed = searchDocs("EVA medical care suit breach Armstrong limit DCS", 3);
    assertValidCitations(evaMed);
    const evaCombined = evaMed.map((r) => `${r.doc} ${r.text}`).join(" ");
    expect(evaCombined).toMatch(/OCHMO|NASA-STD-3001|AMCL/i);
    expect(evaCombined).toMatch(/Armstrong|decompression|medical/i);

    const amcl = searchDocs("Accepted Medical Condition List exploration medical capability", 3);
    assertValidCitations(amcl);
    expect(amcl.some((r) => /AMCL|NTRS_20190027540/i.test(r.doc))).toBe(true);
  });

  it("retrieves Mars atmosphere and MOXIE ISRU documentation", () => {
    const gram = searchDocs("Mars-GRAM atmospheric density dust storm", 3);
    assertValidCitations(gram);
    expect(gram.some((r) => /Mars-GRAM/i.test(r.doc))).toBe(true);

    const moxie = searchDocs("MOXIE oxygen production solid oxide electrolysis", 3);
    assertValidCitations(moxie);
    expect(moxie.some((r) => /MOXIE/i.test(r.doc))).toBe(true);
  });

  it("executes queries in under 2 ms", () => {
    const queries = [
      "O2 partial pressure hypoxia",
      "CO2 limits spacesuit",
      "radiation dose limit 600 mSv",
      "suit pressure 29.6 kPa",
      "EVA medical care decompression sickness",
    ];
    // Warm up JIT once before measuring.
    searchDocs("warmup query", 3);

    const start = performance.now();
    for (const q of queries) {
      const res = searchDocs(q, 3);
      expect(res.length).toBeLessThanOrEqual(3);
    }
    const elapsedMs = performance.now() - start;
    const avgMs = elapsedMs / queries.length;
    expect(avgMs).toBeLessThan(2);
  });

  it("handles empty, zero-k, and non-matching queries safely", () => {
    expect(searchDocs("", 3)).toEqual([]);
    expect(searchDocs("   ", 3)).toEqual([]);
    expect(searchDocs("oxygen", 0)).toEqual([]);
    expect(searchDocs("xyzzyplughnonexistenttoken999", 3)).toEqual([]);
  });
});

describe("8.0 kg pod, non-pyrotechnic beacons, and Mars GNSS-denied localization + 3D LiDAR", () => {
  it("proposes an 8.0 kg multi-consumable life-support pod with 18.0 m^2 parachute", () => {
    const ctx = makeTestContext();
    const res = callTool("launch_pod", { target_x: 118, target_z: 80, payload: "full_life_support" }, ctx, "MAINTENANCE") as {
      type: string;
      args: { mass_kg: number; chute_cda_m2: number; breakdown_kg: Record<string, number> };
    };
    expect(res.type).toBe("launch_pod");
    expect(res.args.mass_kg).toBe(8.0);
    expect(res.args.chute_cda_m2).toBe(18.0);
    expect(res.args.breakdown_kg.o2_copv_total_kg).toBe(4.0);
    expect(res.args.breakdown_kg.o2_usable_gas_kg).toBe(1.0);
    expect(res.args.breakdown_kg.co2_scrubber_lioh_kg).toBe(1.2);
  });

  it("enforces NASA-STD-3001 non-pyrotechnic beacon rules and dust-storm drone grounding in GUARDIAN", () => {
    const ctx = makeTestContext();
    const pyroBlocked = ruleCheck(
      { type: "deploy_beacons", args: { to_x: 0, to_z: 0, mode: "drone_drop", pyrotechnic: true }, proposedBy: "BASE" },
      ctx,
    );
    expect(pyroBlocked?.decision).toBe("deny");
    expect(pyroBlocked?.reason).toMatch(/Pyrotechnic flares are prohibited/i);

    const stormCtx = { ...ctx, env: { ...ctx.env, tau: 2.3 } };
    const droneBlocked = ruleCheck(
      { type: "deploy_beacons", args: { to_x: 0, to_z: 0, mode: "drone_drop", unit_id: "drone-1" }, proposedBy: "BASE" },
      stormCtx,
    );
    expect(droneBlocked?.decision).toBe("deny");
    expect(droneBlocked?.reason).toMatch(/aircraft grounding limit/i);

    const canisterAllowed = ruleCheck(
      { type: "deploy_beacons", args: { to_x: 0, to_z: 0, mode: "ballistic_canister", spacing_m: 50 }, proposedBy: "BASE" },
      stormCtx,
    );
    expect(canisterAllowed).toBeNull();
  });

  it("returns Mars MRL + UWB ToF mesh + 360-deg 3D Flash LiDAR scan and dispatches rover-2 to astronaut position", async () => {
    const ctx = makeTestContext();
    const loc = callTool("get_localization_and_lidar", { target_id: "rover-2" }, ctx, "ROBOT.rover-2") as {
      localization_mode: string;
      astronaut: { lat_deg: number; lon_e_deg: number };
      fleet: { id: string; distance_to_astronaut_m: number }[];
      lidar_scan: { range_m: number; sectors: unknown[] };
    };
    expect(loc.localization_mode).toMatch(/HiRISE/i);
    expect(loc.astronaut.lat_deg).toBeCloseTo(-4.59, 1);
    expect(loc.astronaut.lon_e_deg).toBeCloseTo(137.44, 1);
    expect(loc.lidar_scan.range_m).toBe(60);
    expect(loc.lidar_scan.sectors.length).toBe(8);

    const dispatchRes = await offlineReply("Base, mandá al rover 2 a mi posición", ctx);
    const dispatchAction = dispatchRes.actions.find((a) => a.type === "dispatch");
    expect(dispatchAction).toBeDefined();
    expect(dispatchAction?.args.unit_id).toBe("rover-2");
    expect(dispatchAction?.args.x).toBe(ctx.astronaut.x);
    expect(dispatchAction?.args.z).toBe(ctx.astronaut.z);
  });
});

