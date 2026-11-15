import { describe, expect, it, vi } from "vitest";
import type { ComponentHealthReport, MissionContext } from "@th/shared";

vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => false,
  chat: vi.fn(),
}));

import { ruleCheck, review } from "../guardian.js";
import { getAgentSpec, AGENTS } from "../hierarchy.js";
import { offlineReply } from "../offline.js";
import { buildContext } from "../routes.js";
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
    met_s: 900,
    astronaut: { x: -120, z: -200, body_kg: 78, load_kg: 65, speed: 0 },
    suit: {
      suit_pressure_pa: 29600,
      o2_primary_kg: 1.1,
      fan_pri_rpm: 30000,
      scrubber_a_co2_storage: 25,
      suit_co2_pa: 350,
      coolant_liquid_pressure: 500,
    },
    leak_diameter_m: 0,
    env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 10 },
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: -100, z: -210, battery: 0.85, busy: false },
      { id: "rescue-1", kind: "rescue", x: -150, z: -220, battery: 0.9, busy: true },
      { id: "manip-1", kind: "manipulator", x: -110, z: -190, battery: 0.9, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

describe("FDIR tools, RAG pre-filter, and context sanitization", () => {
  it("evaluates component health deterministically and enforces ROBOT.<id> unit_id scoping", () => {
    const ctx = makeContext({
      fleet_windows: {
        "rover-1": [
          { t_s: 0, slip_ratio: 0.1, motor_current_a: 5 },
          { t_s: 100, slip_ratio: 0.42, motor_current_a: 5.5 },
        ],
      },
    });
    const maint = callTool("evaluate_component_health", { scope: "all" }, ctx, "MAINTENANCE") as ComponentHealthReport;
    expect(maint.active_fault_codes).toEqual(["RVR-MOB-01"]);

    const selfReport = callTool("evaluate_component_health", { scope: "fleet", unit_id: "rover-1" }, ctx, "ROBOT.rover-1") as ComponentHealthReport;
    expect(selfReport.active_fault_codes).toEqual(["RVR-MOB-01"]);

    const crossUnit = callTool("evaluate_component_health", { scope: "fleet", unit_id: "manip-1" }, ctx, "ROBOT.rover-1") as { error?: string };
    expect(crossUnit.error).toMatch(/only inspect unit_id "rover-1"/i);
  });

  it("pre-filters searchDocs by fault_codes and returns exact (doc, page) citations", () => {
    const codes = [
      "PLSS-FAN-01",
      "PLSS-SCRUB-01",
      "PLSS-COOL-01",
      "RVR-MOB-01",
      "RVR-THM-01",
      "ARM-TORQ-01",
      "HAB-PWR-01",
      "ISRU-MOX-01",
    ];
    for (const code of codes) {
      const hits = searchDocs("SOP recovery derate switch_redundant safe_halt", 3, [code]);
      expect(hits.length, `expected SOP chunks for ${code}`).toBeGreaterThanOrEqual(1);
      for (const h of hits) {
        expect(h.fault_codes).toContain(code);
        expect(h.doc.length).toBeGreaterThan(0);
        expect(h.page).toBeGreaterThanOrEqual(1);
      }
    }
    expect(searchDocs("fan speed recovery", 3, ["UNKNOWN-99"])).toEqual([]);
  });

  it("sanitizes bounded suit_window, fleet_health, fleet_windows, and power_isru_window in buildContext", () => {
    const manySuit = Array.from({ length: 120 }, (_, i) => ({ t_s: i * 10, fan_pri_rpm: 30000 - i * 10 }));
    const ctx = buildContext(
      {
        suit_window: [...manySuit, { t_s: "bad", fan_pri_rpm: 100 }],
        fleet_health: {
          "rover-1": { motor_current_a: 14.5, isolated: true, fault_codes: ["RVR-MOB-01"] },
          bad: "not-an-object",
        },
        fleet_windows: {
          "rover-1": [{ t_s: 10, slip_ratio: 0.4 }, { t_s: NaN, slip_ratio: 0.9 }],
        },
        power_isru_window: [{ t_s: 20, moxie_compressor_a: 9.2, solar_dust_factor: "bad" }],
      },
      "en",
    );
    expect(ctx.suit_window).toHaveLength(90);
    expect(ctx.suit_window?.[0].t_s).toBe(300);
    expect(ctx.fleet_health?.["rover-1"]).toEqual({
      motor_current_a: 14.5,
      isolated: true,
      fault_codes: ["RVR-MOB-01"],
    });
    expect(ctx.fleet_health?.bad).toBeUndefined();
    expect(ctx.fleet_windows?.["rover-1"]).toEqual([{ t_s: 10, slip_ratio: 0.4 }]);
    expect(ctx.power_isru_window).toEqual([{ t_s: 20, moxie_compressor_a: 9.2 }]);
  });

  it("grants FDIR tools to MAINTENANCE and ROBOT.<id>", () => {
    expect(AGENTS.MAINTENANCE.tools).toContain("evaluate_component_health");
    expect(AGENTS.MAINTENANCE.tools).toContain("isolate_component");
    const robot = getAgentSpec("ROBOT.rover-1", makeContext());
    expect(robot?.tools).toContain("evaluate_component_health");
    expect(robot?.tools).toContain("isolate_component");
  });
});

describe("GUARDIAN hardware FDIR safety gates", () => {
  it("denies dispatch for isolated units or critical RVR-MOB-01 / RVR-THM-01", () => {
    const isolatedCtx = makeContext({
      fleet_health: { "rover-1": { isolated: true } },
    });
    const vIsolated = ruleCheck(
      { type: "dispatch", args: { unit_id: "rover-1", x: -110, z: -205, task: "goto" }, proposedBy: "BASE" },
      isolatedCtx,
    );
    expect(vIsolated?.decision).toBe("deny");

    const critMobCtx = makeContext({
      fleet_health: { "rover-1": { motor_current_a: 19.2, slip_ratio: 0.05 } },
    });
    const vMob = ruleCheck(
      { type: "dispatch", args: { unit_id: "rover-1", x: -110, z: -205, task: "goto" }, proposedBy: "BASE" },
      critMobCtx,
    );
    expect(vMob?.decision).toBe("deny");
    expect(vMob?.reason).toMatch(/RVR-MOB-01/);
  });

  it("denies arm_skill drill, sample, and handover when manip-1 has critical ARM-TORQ-01 or RVR-THM-01", () => {
    const critArmCtx = makeContext({
      fleet_health: { "manip-1": { drill_torque_nm: 47, actuator_temp_c: 88 } },
    });
    for (const skill of ["drill", "sample", "handover"] as const) {
      const target_id = skill === "handover" ? "astronaut" : "T1";
      const v = ruleCheck(
        { type: "arm_skill", args: { unit_id: "manip-1", skill, target_id }, proposedBy: "ROBOT.manip-1" },
        critArmCtx,
      );
      expect(v?.decision).toBe("deny");
      expect(v?.reason).toMatch(/ARM-TORQ-01|RVR-THM-01/);
    }
  });

  it("denies isolate_component when fault_code is not corroborated by clean telemetry", () => {
    const cleanCtx = makeContext({
      suit_window: [
        { t_s: 0, fan_pri_rpm: 30000, scrubber_a_co2_storage: 20 },
        { t_s: 60, fan_pri_rpm: 30000, scrubber_a_co2_storage: 21 },
      ],
      fleet_health: {
        "rover-1": { motor_current_a: 4.5, slip_ratio: 0.05, actuator_temp_c: 30, fault_codes: ["RVR-MOB-01"] },
      },
    });
    const vSuit = ruleCheck(
      {
        type: "isolate_component",
        args: {
          target_type: "suit",
          target_id: "suit",
          subsystem: "ventilation_fan",
          fault_code: "PLSS-FAN-01",
          action: "safe_halt",
        },
        proposedBy: "MAINTENANCE",
      },
      cleanCtx,
    );
    expect(vSuit?.decision).toBe("deny");
    expect(vSuit?.reason).toMatch(/not corroborated/i);

    const vRover = ruleCheck(
      {
        type: "isolate_component",
        args: {
          target_type: "fleet",
          target_id: "rover-1",
          subsystem: "wheel_drive",
          fault_code: "RVR-MOB-01",
          action: "quarantine",
        },
        proposedBy: "ROBOT.rover-1",
      },
      cleanCtx,
    );
    expect(vRover?.decision).toBe("deny");
  });

  it("allows verified switch_redundant on critical faults and requires ask_human for quarantine/safe_halt on degraded or active rescue units", async () => {
    const critFanCtx = makeContext({
      suit_window: [
        { t_s: 0, fan_pri_rpm: 24000 },
        { t_s: 120, fan_pri_rpm: 17500 },
      ],
    });
    const switchVerdict = await review(
      {
        type: "isolate_component",
        args: {
          target_type: "suit",
          target_id: "suit",
          subsystem: "ventilation_fan",
          fault_code: "PLSS-FAN-01",
          action: "switch_redundant",
        },
        proposedBy: "MAINTENANCE",
      },
      critFanCtx,
      "Check suit fan failure and switch to redundant fan",
      ["NTRS_20150003027_EMU_FPS_FDIR p.2"],
    );
    expect(switchVerdict.decision).toBe("allow");

    const degradedRoverCtx = makeContext({
      fleet_windows: {
        "rover-1": [
          { t_s: 0, slip_ratio: 0.2 },
          { t_s: 120, slip_ratio: 0.4 },
        ],
      },
    });
    const degradedQuarantine = ruleCheck(
      {
        type: "isolate_component",
        args: {
          target_type: "fleet",
          target_id: "rover-1",
          subsystem: "wheel_drive",
          fault_code: "RVR-MOB-01",
          action: "quarantine",
        },
        proposedBy: "MAINTENANCE",
      },
      degradedRoverCtx,
    );
    expect(degradedQuarantine?.decision).toBe("ask_human");

    const activeRescueCritCtx = makeContext({
      fleet_health: { "rescue-1": { motor_current_a: 19.0, slip_ratio: 0.05 } },
    });
    const rescueHalt = ruleCheck(
      {
        type: "isolate_component",
        args: {
          target_type: "fleet",
          target_id: "rescue-1",
          subsystem: "wheel_drive",
          fault_code: "RVR-MOB-01",
          action: "safe_halt",
        },
        proposedBy: "MAINTENANCE",
      },
      activeRescueCritCtx,
    );
    expect(rescueHalt?.decision).toBe("ask_human");
  });
});

describe("MAINTENANCE offline FDIR end-to-end flow", () => {
  it("reports exact RPM slope, RUL, cited FDIR SOP, show_alert, and switch_redundant on critical PLSS fan fault", async () => {
    const ctx = makeContext({
      suit_window: [
        { t_s: 0, fan_pri_rpm: 24000, scrubber_a_co2_storage: 20 },
        { t_s: 100, fan_pri_rpm: 21000, scrubber_a_co2_storage: 20 },
        { t_s: 200, fan_pri_rpm: 17500, scrubber_a_co2_storage: 20 },
      ],
    });
    const res = await offlineReply("Check suit fan maintenance trend", ctx);
    expect(res.route).toEqual(["SUIT.VOICE-EXEC", "BASE", "MAINTENANCE"]);
    expect(res.speech).toMatch(/PLSS-FAN-01/);
    expect(res.speech).toMatch(/-32\.5\/s/);
    expect(res.speech).toMatch(/RUL 0 s/);
    expect(res.speech).toMatch(/NTRS_20150003027_EMU_FPS_FDIR p\.\d+/);
    expect(res.speech).toMatch(/switch_redundant/);

    const alert = res.actions.find((a) => a.type === "show_alert");
    expect(alert?.args.level).toBe("crit");

    const isolate = res.actions.find((a) => a.type === "isolate_component");
    expect(isolate?.args.fault_code).toBe("PLSS-FAN-01");
    expect(isolate?.args.action).toBe("switch_redundant");
    expect(isolate?.verdict?.decision).toBe("allow");
  });
});
