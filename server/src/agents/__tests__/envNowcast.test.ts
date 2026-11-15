import { performance } from "node:perf_hooks";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_LIMITS } from "@th/shared";
import type { MissionContext } from "../types.js";

const mockChat = vi.fn();

vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => false,
  chat: (...args: unknown[]) => mockChat(...args),
}));

import { ruleCheck } from "../guardian.js";
import { AGENTS, handleVoice } from "../hierarchy.js";
import { offlineReply } from "../offline.js";
import { buildContext } from "../routes.js";
import { runAgent } from "../runAgent.js";
import { searchDocs } from "../tools/knowledge.js";
import { TOOLS } from "../tools/registry.js";

function callTool(name: string, args: Record<string, unknown>, ctx: MissionContext, caller: string) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Missing tool ${name}`);
  return tool.run(args as never, ctx, caller);
}

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    lang: "en",
    met_s: 3600,
    astronaut: { x: 200, z: 150, body_kg: 78, load_kg: 65, speed: 0.5 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.1, o2_reserve_kg: 0.5 },
    leak_diameter_m: 0,
    env: {
      pressure_pa: 750,
      air_temp_k: 220,
      ground_temp_k: 245,
      tau: 0.5,
      wind_ms: 6,
      dose_rate_ugy_h: 11,
      cumulative_dose_ugy: 420,
      sol: 2080,
      lst_h: 13.5,
      sun_elev_deg: 45,
    },
    base_battery_wh: 420000,
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: 100, z: 0, battery: 0.88, busy: false },
      { id: "rescue-1", kind: "rescue", x: 50, z: 0, battery: 0.95, busy: false },
      { id: "drone-1", kind: "drone", x: 40, z: 30, battery: 0.85, busy: false },
      { id: "glider-1", kind: "glider", x: -40, z: 30, battery: 0.85, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

describe("Atmospheric and Space-Weather RAG corpus (searchDocs)", () => {
  it("retrieves REMS, MEDA, DONKI/WSA-Enlil, Mars-GRAM, MCD, MSL_RAD, and NASA-STD-3001 citations in < 5 ms", () => {
    const cases: { query: string; docPattern: RegExp }[] = [
      { query: "REMS thermal tide pressure precursor 2018 dust storm", docPattern: /MSL_REMS_Thermal_Tides_Brief/i },
      { query: "MEDA RDS optical depth air density rotorcraft flight", docPattern: /Perseverance_MEDA_Optical_Density_Brief/i },
      { query: "DONKI WSA-Enlil SEP arrival radiation ALARA shelter", docPattern: /CCMC_DONKI_WSA_Enlil_SEP_Brief|NASA-STD-3001/i },
      { query: "dust storm solar power curtailment battery fission", docPattern: /Mars_Solar_Curtailment_Brief/i },
      { query: "Mars-GRAM atmospheric density dust storm", docPattern: /Mars-GRAM/i },
      { query: "MCD Martian Climate Database dust scenario", docPattern: /MCD_user_manual/i },
      { query: "RAD silicon detector dose rate RDR", docPattern: /MSL_RAD_RDR_SIS/i },
      { query: "radiation ALARA shelter effective dose limit 600 mSv", docPattern: /NASA-STD-3001/i },
    ];

    searchDocs("warmup", 2);
    const t0 = performance.now();
    for (const c of cases) {
      const hits = searchDocs(c.query, 3);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some((h) => c.docPattern.test(h.doc) && Number.isInteger(h.page) && h.page >= 1)).toBe(true);
    }
    const avgMs = (performance.now() - t0) / cases.length;
    expect(avgMs).toBeLessThan(5);
  });
});

describe("buildContext environmental sanitization", () => {
  it("preserves sol, lst_h, ground_temp_k, cumulative_dose_ugy, base_battery_wh, donki_alert, and caps env_window at 48 samples", () => {
    const samples = Array.from({ length: 60 }, (_, i) => ({
      t_s: i * 600,
      sol: 2080,
      lst_h: 10 + i * 0.1,
      pressure_pa: 760,
      air_temp_k: 225,
      ground_temp_k: 250,
      tau: 0.6 + i * 0.01,
      wind_ms: 7,
      dose_rate_ugy_h: 12,
      sun_elev_deg: 40,
    }));
    const ctx = buildContext(
      {
        env: {
          pressure_pa: 760,
          air_temp_k: 225,
          ground_temp_k: 252,
          tau: 1.2,
          wind_ms: 8,
          dose_rate_ugy_h: 14,
          cumulative_dose_ugy: 510,
          sol: 2080,
          lst_h: 14.5,
        },
        env_window: [...samples, { t_s: "bad", tau: 0.5 }],
        base_battery_wh: 380000,
        donki_alert: { active_sep: true, wsa_enlil_mars_arrival_h: 3.2, source_id: "WSA-ENLIL/49122/1" },
      },
      "en",
    );

    expect(ctx.env.sol).toBe(2080);
    expect(ctx.env.lst_h).toBe(14.5);
    expect(ctx.env.ground_temp_k).toBe(252);
    expect(ctx.env.cumulative_dose_ugy).toBe(510);
    expect(ctx.base_battery_wh).toBe(380000);
    expect(ctx.donki_alert).toEqual({
      active_sep: true,
      wsa_enlil_mars_arrival_h: 3.2,
      source_id: "WSA-ENLIL/49122/1",
    });
    expect(ctx.env_window).toHaveLength(48);
    expect(ctx.env_window![0].t_s).toBe(12 * 600);
  });
});

describe("MCP evaluate_environmental_risk and unified ENV_LIMITS", () => {
  it("registers evaluate_environmental_risk on mcp-environment and shares ENV_LIMITS with evaluate_eva_weather", () => {
    const tool = TOOLS.find((t) => t.name === "evaluate_environmental_risk");
    expect(tool?.server).toBe("environment");
    expect(tool?.effect).toBe(false);

    const ctx = makeContext({
      env: { ...makeContext().env, tau: 1.1 },
      env_window: [
        { t_s: 0, pressure_pa: 750, air_temp_k: 220, tau: 0.7, wind_ms: 6, dose_rate_ugy_h: 11 },
        { t_s: 3600, pressure_pa: 755, air_temp_k: 235, tau: 1.1, wind_ms: 8, dose_rate_ugy_h: 12 },
      ],
    });
    const risk = callTool("evaluate_environmental_risk", { duration_min: 120, return_to_shelter_min: 25 }, ctx, "WEATHER-RAD") as {
      time_to_storm_onset_s: number | null;
      limits: typeof ENV_LIMITS;
    };
    const weather = callTool("evaluate_eva_weather", { duration_min: 120, return_to_shelter_min: 25 }, ctx, "WEATHER-RAD") as {
      limits: typeof ENV_LIMITS;
    };

    expect(risk.time_to_storm_onset_s).toBeGreaterThan(0);
    expect(risk.limits).toEqual(ENV_LIMITS);
    expect(weather.limits).toEqual(ENV_LIMITS);
  });
});

describe("GUARDIAN aircraft envelope and SEP radiation gates", () => {
  it("denies drone and glider dispatch above wind or below air density limits, while allowing land/hold", () => {
    const windyCtx = makeContext({ env: { ...makeContext().env, wind_ms: ENV_LIMITS.maxFlightWindMs } });
    expect(
      ruleCheck({ type: "dispatch", args: { unit_id: "glider-1", x: 80, z: 80, task: "survey" }, proposedBy: "BASE" }, windyCtx)?.decision,
    ).toBe("deny");
    expect(
      ruleCheck({ type: "unit_action", args: { unit_id: "drone-1", action: "takeoff" }, proposedBy: "BASE" }, windyCtx)?.decision,
    ).toBe("deny");
    expect(
      ruleCheck({ type: "unit_action", args: { unit_id: "drone-1", action: "land" }, proposedBy: "BASE" }, windyCtx)?.decision,
    ).not.toBe("deny");

    // Low surface density: 500 / (191.8 * 260) = 0.0100 kg/m^3 < 0.012 kg/m^3
    const thinCtx = makeContext({ env: { ...makeContext().env, pressure_pa: 500, air_temp_k: 260 } });
    expect(
      ruleCheck({ type: "dispatch", args: { unit_id: "drone-1", x: 80, z: 80, task: "goto" }, proposedBy: "BASE" }, thinCtx)?.decision,
    ).toBe("deny");
    expect(
      ruleCheck({ type: "deploy_beacons", args: { to_x: 0, to_z: 0, mode: "drone_drop" }, proposedBy: "BASE" }, windyCtx)?.decision,
    ).toBe("deny");
  });

  it("gates outward non-rescue dispatches during SEP radiation spikes and DONKI active_sep alerts", () => {
    const abortCtx = makeContext({
      env: { ...makeContext().env, dose_rate_ugy_h: ENV_LIMITS.sepDoseAbortUgyH },
    });
    const outwardAbort = ruleCheck(
      { type: "dispatch", args: { unit_id: "rover-1", x: 300, z: 0, task: "survey" }, proposedBy: "BASE" },
      abortCtx,
    );
    expect(outwardAbort?.decision).toBe("deny");

    // Inward return toward shelter (0, 0) and rescue tasks remain allowed.
    const inwardReturn = ruleCheck(
      { type: "dispatch", args: { unit_id: "rover-1", x: 0, z: 0, task: "goto" }, proposedBy: "BASE" },
      abortCtx,
    );
    expect(inwardReturn).toBeNull();

    const rescueOutward = ruleCheck(
      { type: "dispatch", args: { unit_id: "rescue-1", x: 300, z: 0, task: "rescue" }, proposedBy: "BASE" },
      abortCtx,
    );
    expect(rescueOutward).toBeNull();

    // Active DONKI SEP + rising RAD slope -> deny; active DONKI SEP without rising slope -> ask_human.
    const risingDonkiCtx = makeContext({
      donki_alert: { active_sep: true, wsa_enlil_mars_arrival_h: 1.5, source_id: "SEP-1" },
      env_window: [
        { t_s: 0, pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 15 },
        { t_s: 1800, pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 24 },
      ],
    });
    expect(
      ruleCheck({ type: "dispatch", args: { unit_id: "rover-1", x: 300, z: 0, task: "goto" }, proposedBy: "BASE" }, risingDonkiCtx)?.decision,
    ).toBe("deny");

    const warnCtx = makeContext({
      env: { ...makeContext().env, dose_rate_ugy_h: ENV_LIMITS.sepDoseWarnUgyH },
    });
    expect(
      ruleCheck({ type: "dispatch", args: { unit_id: "rover-1", x: 300, z: 0, task: "goto" }, proposedBy: "BASE" }, warnCtx)?.decision,
    ).toBe("ask_human");
  });
});

describe("WEATHER-RAD and EVA-PLANNER integration", () => {
  beforeEach(() => {
    mockChat.mockReset();
  });

  it("grants EVA-PLANNER get_storm_forecast and search_docs", () => {
    expect(AGENTS["EVA-PLANNER"].tools).toContain("get_storm_forecast");
    expect(AGENTS["EVA-PLANNER"].tools).toContain("search_docs");
    expect(AGENTS["EVA-PLANNER"].tools).toContain("evaluate_environmental_risk");
  });

  it("executes evaluate_environmental_risk + search_docs in WEATHER-RAD offlineReply with citations and alert", async () => {
    const ctx = makeContext({
      env: { ...makeContext().env, tau: 1.1, dose_rate_ugy_h: 32 },
      env_window: [
        { t_s: 0, pressure_pa: 750, air_temp_k: 220, tau: 0.7, wind_ms: 6, dose_rate_ugy_h: 18 },
        { t_s: 3600, pressure_pa: 756, air_temp_k: 240, tau: 1.1, wind_ms: 9, dose_rate_ugy_h: 32 },
      ],
      donki_alert: { active_sep: true, wsa_enlil_mars_arrival_h: 2, source_id: "DONKI-SEP" },
    });

    const res = await offlineReply("Check solar radiation and storm weather for EVA", ctx);
    const toolNames = res.trace
      .filter((e) => e.kind === "tool")
      .map((e) => (e.detail as { tool?: string }).tool);

    expect(toolNames).toContain("evaluate_environmental_risk");
    expect(toolNames).toContain("search_docs");
    const alert = res.actions.find((a) => a.type === "show_alert");
    expect(alert).toBeDefined();
    expect(String(alert?.args.source)).toMatch(/p\.\d+/);
    expect(res.speech).toMatch(/p\.\d+/);
  });

  it("drives WEATHER-RAD LLM loop to call evaluate_environmental_risk, search_docs, and show_alert", async () => {
    const providerMod = await import("../../llm/provider.js");
    const spy = vi.spyOn(providerMod, "llmAvailable").mockReturnValue(true);

    try {
      mockChat
        .mockResolvedValueOnce({
          role: "assistant",
          content: null,
          tool_calls: [
            { id: "tc_risk", type: "function", function: { name: "evaluate_environmental_risk", arguments: "{}" } },
            {
              id: "tc_docs",
              type: "function",
              function: { name: "search_docs", arguments: JSON.stringify({ query: "ALARA SEP shelter NASA-STD-3001", k: 2 }) },
            },
          ],
        })
        .mockResolvedValueOnce({
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "tc_alert",
              type: "function",
              function: {
                name: "show_alert",
                arguments: JSON.stringify({
                  level: "warn",
                  text: "SEP dose 32 uGy/h; seek ALARA shelter (NASA-STD-3001_Vol2_RevE p.68)",
                  source: "NASA-STD-3001_Vol2_RevE p.68",
                }),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          role: "assistant",
          content: "Verdict go_with_changes: storm onset 3600 s, projected EVA dose 88 uGy; seek shelter (NASA-STD-3001_Vol2_RevE p.68).",
        })
        .mockResolvedValueOnce({
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "del_wx",
              type: "function",
              function: {
                name: "delegate",
                arguments: JSON.stringify({ agent: "WEATHER-RAD", objective: "Evaluate weather forecast" }),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          role: "assistant",
          content: null,
          tool_calls: [
            { id: "tc_risk2", type: "function", function: { name: "evaluate_environmental_risk", arguments: "{}" } },
            {
              id: "tc_docs2",
              type: "function",
              function: { name: "search_docs", arguments: JSON.stringify({ query: "REMS thermal tide dust storm", k: 1 }) },
            },
          ],
        })
        .mockResolvedValueOnce({
          role: "assistant",
          content: "Verdict go: tau 0.50, solar margin nominal (MSL_REMS_Thermal_Tides_Brief p.1).",
        });

      const res = await runAgent(AGENTS["WEATHER-RAD"], "Evaluate SEP and storm risk", makeContext());
      const toolsCalled = res.trace
        .filter((e) => e.kind === "tool")
        .map((e) => (e.detail as { tool?: string }).tool);

      expect(toolsCalled).toContain("evaluate_environmental_risk");
      expect(toolsCalled).toContain("search_docs");
      expect(res.actions.some((a) => a.type === "show_alert")).toBe(true);
      expect(res.text).toMatch(/NASA-STD-3001_Vol2_RevE p\.68/);

      const voiceRes = await handleVoice("Check weather forecast", makeContext());
      expect(voiceRes.route).toEqual(["SUIT.VOICE-EXEC", "BASE", "WEATHER-RAD"]);
      expect(voiceRes.text).toMatch(/MSL_REMS_Thermal_Tides_Brief p\.1/);
    } finally {
      spy.mockRestore();
    }
  });
});
