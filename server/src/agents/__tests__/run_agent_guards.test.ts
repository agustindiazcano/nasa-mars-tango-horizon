import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MissionContext } from "../types.js";

const mockChat = vi.fn();

vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => true,
  chat: (...args: unknown[]) => mockChat(...args),
}));

import { AGENTS, handleVoice, shouldEscalateFast } from "../hierarchy.js";
import { claimsMissingTelemetry, claimsUnitActionWithoutExecution, runAgent } from "../runAgent.js";

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    lang: "es",
    met_s: 600,
    astronaut: { x: -160, z: -280, body_kg: 78, load_kg: 65, speed: 0 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2, co2_pa: 210, fan_rpm: 28400, heart_rate_bpm: 78 },
    leak_diameter_m: 0,
    env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 10 },
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: -120, z: -300, battery: 0.9, busy: false },
      { id: "rescue-1", kind: "rescue", x: -190, z: -300, battery: 0.9, busy: false },
      { id: "manip-1", kind: "manipulator", x: -150, z: -270, battery: 0.9, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    targets: [{ id: "T1", kind: "sulfate_vein", distance_m: 9 }],
    ...overrides,
  };
}

describe("runAgent and hierarchy reliability guards", () => {
  beforeEach(() => {
    mockChat.mockReset();
  });

  it("detects unexecuted unit action claims while allowing denials", () => {
    expect(claimsUnitActionWithoutExecution("Rescue-1, orden de regreso a base: ejecuto directamente.")).toBe(true);
    expect(claimsUnitActionWithoutExecution("Rover-1 en camino hacia tu posición.")).toBe(true);
    expect(claimsUnitActionWithoutExecution("Rover-1 no puede despegar porque es un rover terrestre.")).toBe(false);
    expect(claimsUnitActionWithoutExecution("Acción denegada por GUARDIAN.")).toBe(false);
    expect(claimsMissingTelemetry("Sin datos de telemetría de oxígeno disponibles en este momento.")).toBe(true);
  });

  it("nudges BASE when it claims a unit action without calling a tool, and blocks false success if it still refuses", async () => {
    mockChat
      .mockResolvedValueOnce({ role: "assistant", content: "Rescue-1, orden de regreso a base: ejecuto directamente." })
      .mockResolvedValueOnce({ role: "assistant", content: "Rescue-1 volviendo a la base." });

    const res = await runAgent(AGENTS.BASE, "Rescue uno, volvé a la base", makeContext());
    expect(mockChat).toHaveBeenCalledTimes(2);
    expect(res.actions).toHaveLength(0);
    expect(res.text).toMatch(/No se ejecutó ninguna acción/i);
  });

  it("nudges SUIT.VOICE-EXEC to call telemetry tools instead of saying telemetry is missing", async () => {
    mockChat
      .mockResolvedValueOnce({ role: "assistant", content: "Sin datos de telemetría de oxígeno disponibles." })
      .mockResolvedValueOnce({
        role: "assistant",
        content: null,
        tool_calls: [{ id: "tc_1", type: "function", function: { name: "get_consumables_margin", arguments: "{}" } }],
      })
      .mockResolvedValueOnce({ role: "assistant", content: "Quedan 1.2 kg de oxígeno, 24.4 horas." });

    const res = await runAgent(AGENTS["SUIT.VOICE-EXEC"], "Cuánto oxígeno me queda", makeContext());
    expect(mockChat).toHaveBeenCalledTimes(3);
    expect(res.text).toContain("1.2 kg");
  });

  it("escalates to BASE when SUIT.VOICE-EXEC returns empty or No action taken", async () => {
    mockChat
      .mockResolvedValueOnce({ role: "assistant", content: "" })
      .mockResolvedValueOnce({ role: "assistant", content: "" })
      .mockResolvedValueOnce({ role: "assistant", content: "Presión 29.6 kPa y O2 al 1.2 kg." });

    const res = await handleVoice("Cómo está mi traje hoy", makeContext());
    expect(res.route).toEqual(["SUIT.VOICE-EXEC", "BASE"]);
    expect(res.text).toContain("29.6 kPa");
  });

  it("pre-escalates unit, weather, and route orders without a SUIT.VOICE-EXEC LLM hop", () => {
    const ctx = makeContext();
    expect(shouldEscalateFast("Rover uno, seguime", ctx)).toBe(true);
    expect(shouldEscalateFast("Cómo está el clima para una EVA, puedo salir", ctx)).toBe(true);
    expect(shouldEscalateFast("Planificá una ruta hasta S2", ctx)).toBe(true);
    expect(shouldEscalateFast("Lanzá una cápsula de soporte vital", ctx)).toBe(true);
    expect(shouldEscalateFast("Mostrá la capa térmica", ctx)).toBe(false);
    expect(shouldEscalateFast("Mostrá la capa de radiación", ctx)).toBe(false);
    expect(shouldEscalateFast("Cuánto oxígeno me queda", makeContext({ leak_diameter_m: 0.0016, emergency_response_active: true }))).toBe(false);
    expect(shouldEscalateFast("Cuántos vehículos tenemos en la flota", ctx)).toBe(false);
    expect(shouldEscalateFast("Dónde está el rover 1", ctx)).toBe(false);
    expect(shouldEscalateFast("Qué temperatura y viento hay", ctx)).toBe(false);
    expect(shouldEscalateFast("Calculá el lanzamiento de la cápsula de soporte vital", ctx)).toBe(false);
  });

  it("grants SUIT.VOICE-EXEC read-only fleet, localization, weather, biomed, and pod calculation tools (B38)", () => {
    const fastTools = AGENTS["SUIT.VOICE-EXEC"].tools;
    for (const toolName of [
      "list_units",
      "get_localization_and_lidar",
      "get_terrain_at",
      "get_environment",
      "get_storm_forecast",
      "evaluate_eva_weather",
      "evaluate_environmental_risk",
      "calculate_pod_launch",
      "evaluate_crew_biomed",
    ]) {
      expect(fastTools).toContain(toolName);
    }
  });

  it("skips redundant BASE re-summarization after a single valid delegation", async () => {
    mockChat
      .mockResolvedValueOnce({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "del_1",
            type: "function",
            function: { name: "delegate", arguments: JSON.stringify({ agent: "ROBOT.manip-1", objective: "Sample T1" }) },
          },
        ],
      })
      .mockResolvedValueOnce({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "arm_1",
            type: "function",
            function: { name: "arm_skill", arguments: JSON.stringify({ unit_id: "manip-1", skill: "sample", target_id: "T1" }) },
          },
        ],
      })
      .mockResolvedValueOnce({
        role: "assistant",
        content: "Manip-1 tomando muestra de la roca T1.",
      });

    const res = await handleVoice("Manipulador, agarrá la roca T1", makeContext());
    expect(mockChat).toHaveBeenCalledTimes(3);
    expect(res.route).toEqual(["SUIT.VOICE-EXEC", "BASE", "ROBOT.manip-1"]);
    expect(res.actions).toHaveLength(1);
    expect(res.text).toBe("Manip-1 tomando muestra de la roca T1.");
  });

  it("pins compatible provider order after step-0 tool_calls come from vertex", async () => {
    mockChat.mockImplementation((_tier: unknown, _msgs: unknown, opts?: { onMeta?: (m: { provider: string; model: string; ms: number }) => void }) => {
      opts?.onMeta?.({ provider: "vertex", model: "google/gemini-4-carbon", ms: 100 });
      if (mockChat.mock.calls.length === 1) {
        return Promise.resolve({
          role: "assistant",
          content: null,
          tool_calls: [{ id: "tc_1", type: "function", function: { name: "get_environment", arguments: "{}" } }],
        });
      }
      return Promise.resolve({ role: "assistant", content: "Tau 0.5, EVA viable." });
    });

    await runAgent(AGENTS.BASE, "Clima EVA", makeContext());
    const secondCallOpts = mockChat.mock.calls[1][2] as { providers?: string[] };
    expect(secondCallOpts.providers).toEqual(["vertex", "meta"]);
  });
});
