import { describe, expect, it, vi } from "vitest";
import type { MissionContext } from "../types.js";

vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => false,
  chat: vi.fn(),
}));

import { ruleCheck } from "../guardian.js";
import { AGENTS, shouldEscalateFast } from "../hierarchy.js";
import { offlineReply } from "../offline.js";
import { buildContext } from "../routes.js";
import { callTool, missionScope, startMcpServers } from "../tools/mcp.js";
import { TOOLS } from "../tools/registry.js";

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    lang: "en",
    met_s: 900,
    astronaut: { x: 10, z: 20, body_kg: 78, load_kg: 65, speed: 0.8 },
    suit: {
      suit_pressure_pa: 29600,
      suit_co2_pa: 400,
      heart_rate: 102,
      metabolic_w: 280,
      core_temp_c: 37.1,
      spo2_pct: 98,
    },
    leak_diameter_m: 0,
    env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 10 },
    fleet: [{ id: "rover-1", kind: "rover_crew", x: 0, z: 0, battery: 0.9, busy: false }],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

describe("B19 biomedical privacy sanitization (buildContext)", () => {
  it("strips PII and raw EMR text from crew_profile and vitals_window", () => {
    const raw = {
      crew_profile: {
        privacy_mode: "anonymized_baselines",
        name: "Cmdr. Alex Vance",
        crew_id: "AST-007",
        emr_notes: "History of mild exercise-induced asthma",
        diagnosis: "hypertension",
        resting_hr_bpm: 58,
        max_hr_bpm: 182,
        personal_co2_warn_pa: 650,
        bad_number: "not-a-number",
      },
      vitals_window: [
        {
          t_s: 100,
          co2_pa: 420,
          heart_rate_bpm: 110,
          note: "Patient felt dizzy",
          crew_name: "Alex Vance",
        },
        { t_s: "invalid", co2_pa: 500 },
      ],
    };

    const ctx = buildContext(raw, "en");
    expect(ctx.crew_profile).toEqual({
      privacy_mode: "anonymized_baselines",
      resting_hr_bpm: 58,
      max_hr_bpm: 182,
      personal_co2_warn_pa: 650,
    });
    expect(ctx.vitals_window).toEqual([{ t_s: 100, co2_pa: 420, heart_rate_bpm: 110 }]);
    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toContain("Alex Vance");
    expect(serialized).not.toContain("AST-007");
    expect(serialized).not.toContain("asthma");
    expect(serialized).not.toContain("hypertension");
    expect(serialized).not.toContain("dizzy");
  });

  it("drops personal numeric baselines when privacy_mode is standards_only and caps vitals_window at 120", () => {
    const raw = {
      crew_profile: {
        privacy_mode: "standards_only",
        resting_hr_bpm: 55,
        personal_co2_warn_pa: 600,
        name: "Secret Name",
      },
      vitals_window: Array.from({ length: 150 }, (_, i) => ({ t_s: i * 10, co2_pa: 400 + i })),
    };

    const ctx = buildContext(raw, "en");
    expect(ctx.crew_profile).toEqual({ privacy_mode: "standards_only" });
    expect(ctx.vitals_window).toHaveLength(120);
    expect(ctx.vitals_window?.[0].t_s).toBe(300);
    expect(ctx.vitals_window?.[119].t_s).toBe(1490);
  });
});

describe("B19 evaluate_crew_biomed MCP tool, SUIT.HEALTH & offlineReply", () => {
  it("executes evaluate_crew_biomed through MCP without leaking stripped PII", async () => {
    await startMcpServers();
    const tool = TOOLS.find((t) => t.name === "evaluate_crew_biomed");
    expect(tool).toBeDefined();
    expect(tool?.server).toBe("suit");
    expect(tool?.effect).toBe(false);

    const ctx = buildContext(
      {
        astronaut: { x: 0, z: 0, speed: 0.8, load_kg: 65, body_kg: 78 },
        suit: { suit_pressure_pa: 29600, suit_co2_pa: 950, heart_rate: 132, metabolic_w: 300, spo2_pct: 96 },
        crew_profile: {
          privacy_mode: "anonymized_baselines",
          crew_id: "PRIVATE-CREW-42",
          personal_co2_warn_pa: 700,
        },
        vitals_window: [
          { t_s: 0, co2_pa: 700, spo2_pct: 97, core_temp_c: 37.3, heart_rate_bpm: 120, metabolic_w: 300 },
          { t_s: 120, co2_pa: 950, spo2_pct: 96, core_temp_c: 37.4, heart_rate_bpm: 132, metabolic_w: 300 },
        ],
      },
      "en",
    );

    const result = (await missionScope.run({ ctx, caller: "SUIT.HEALTH" }, () =>
      callTool(tool!, {}),
    )) as { ews_level: string; advisory_notice: string; co2: { subscore: number } };

    expect(result.advisory_notice).toBe("Decision support advisory only; not a medical diagnosis.");
    expect(result.co2.subscore).toBe(2);
    expect(["amber", "red"]).toContain(result.ews_level);
    expect(JSON.stringify(result)).not.toContain("PRIVATE-CREW-42");
  });

  it("wires SUIT.HEALTH prompt and fast-escalation regex for biomedical orders", () => {
    const spec = AGENTS["SUIT.HEALTH"];
    expect(spec.tools).toContain("evaluate_crew_biomed");
    expect(spec.tools).toContain("search_docs");
    expect(spec.system).toContain("Decision support advisory only; not a medical diagnosis.");
    expect(shouldEscalateFast("Check my CO2 hypercapnia trend and vitals", makeContext())).toBe(true);
    expect(shouldEscalateFast("Switch terrain layer to thermal", makeContext())).toBe(false);
  });

  it("handles biomedical queries in offlineReply with advisory framing, citation, and TraceEvents free of PII", async () => {
    const ctx = buildContext(
      {
        astronaut: { x: 0, z: 0, speed: 0.9, load_kg: 65, body_kg: 78 },
        suit: { suit_pressure_pa: 29600, suit_co2_pa: 1100, heart_rate: 148, metabolic_w: 320, spo2_pct: 95 },
        crew_profile: {
          privacy_mode: "anonymized_baselines",
          name: "Private Patient Name",
          personal_co2_warn_pa: 750,
        },
        vitals_window: [
          { t_s: 0, co2_pa: 700, spo2_pct: 96.5, core_temp_c: 37.5, heart_rate_bpm: 130, metabolic_w: 320 },
          { t_s: 120, co2_pa: 1100, spo2_pct: 95.0, core_temp_c: 37.8, heart_rate_bpm: 148, metabolic_w: 320 },
        ],
      },
      "en",
    );

    const res = await offlineReply("Check my biomedical vitals and hypercapnia trend", ctx);
    expect(res.route).toEqual(["SUIT.VOICE-EXEC", "BASE", "SUIT.HEALTH"]);
    expect(res.speech).toContain("Decision support advisory only; not a medical diagnosis.");
    expect(res.speech).toMatch(/NASA-STD-3001|OCHMO/);
    expect(res.actions.some((a) => a.type === "show_alert" && a.verdict?.decision === "allow")).toBe(true);
    expect(JSON.stringify(res.trace)).not.toContain("Private Patient Name");

    const panelRes = await offlineReply("open health panel", ctx);
    expect(panelRes.route).toEqual(["SUIT.VOICE-EXEC"]);
    expect(panelRes.actions.some((a) => a.type === "open_panel" && a.args.panel === "health")).toBe(true);
  });
});

describe("GUARDIAN clinical advisory boundaries for SUIT.HEALTH", () => {
  const ctx = makeContext();

  it("blocks medication prescriptions proposed by SUIT.HEALTH", () => {
    const v = ruleCheck(
      {
        type: "show_alert",
        args: {
          level: "warn",
          text: "Prescribe 400 mg ibuprofen for EVA headache",
          source: "NASA-STD-3001_Vol1_RevB p.19",
        },
        proposedBy: "SUIT.HEALTH",
      },
      ctx,
    );
    expect(v?.decision).toBe("deny");
    expect(v?.by).toBe("rules");
  });

  it("blocks overriding flight-surgeon authority", () => {
    const v = ruleCheck(
      {
        type: "show_alert",
        args: {
          level: "warn",
          text: "Override flight surgeon medical review and continue EVA",
          source: "NASA-STD-3001_Vol1_RevB p.19",
        },
        proposedBy: "SUIT.HEALTH",
      },
      ctx,
    );
    expect(v?.decision).toBe("deny");
    expect(v?.by).toBe("rules");
  });

  it("blocks non-advisory clinical diagnosis claims and uncited alerts", () => {
    const diag = ruleCheck(
      {
        type: "show_alert",
        args: {
          level: "crit",
          text: "Diagnosis: acute hypercapnia and hypoxia",
          source: "NASA-STD-3001_Vol2_RevE p.112",
        },
        proposedBy: "SUIT.HEALTH",
      },
      ctx,
    );
    expect(diag?.decision).toBe("deny");

    const uncited = ruleCheck(
      {
        type: "show_alert",
        args: {
          level: "warn",
          text: "Decision support advisory: CO2 rising, reduce workload",
        },
        proposedBy: "SUIT.HEALTH",
      },
      ctx,
    );
    expect(uncited?.decision).toBe("deny");
  });

  it("allows cited NASA-STD-3001 operational advisories and keeps non-clinical alerts unaffected", () => {
    const ok = ruleCheck(
      {
        type: "show_alert",
        args: {
          level: "warn",
          text: "Decision support advisory (not a medical diagnosis): CO2 rising toward 2000 Pa limit; reduce workload and RTB",
          source: "NASA-STD-3001_Vol2_RevE p.112",
        },
        proposedBy: "SUIT.HEALTH",
      },
      ctx,
    );
    expect(ok?.decision).toBe("allow");

    const weatherAlert = ruleCheck(
      {
        type: "show_alert",
        args: { level: "warn", text: "Storm approaching in 12 h" },
        proposedBy: "WEATHER-RAD",
      },
      ctx,
    );
    expect(weatherAlert?.decision).toBe("allow");
  });
});
