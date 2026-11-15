import { describe, expect, it, vi } from "vitest";
import type { MissionContext } from "../types.js";

const chat = vi.fn();
vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => true,
  chat: (...args: unknown[]) => chat(...args),
}));

import { handleVoice } from "../hierarchy.js";
import { runAgent } from "../runAgent.js";
import { AGENTS } from "../hierarchy.js";

const ctx: MissionContext = {
  lang: "es",
  met_s: 600,
  astronaut: { x: -160, z: -280, body_kg: 78, load_kg: 65, speed: 0 },
  suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2 },
  leak_diameter_m: 0,
  env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 10 },
  fleet: [{ id: "rover-1", kind: "rover_crew", x: -120, z: -300, battery: 0.8, busy: false }],
  hud: { layer: "optical", panel: null },
};

describe("silent model replies", () => {
  it("runAgent returns empty text when the model says nothing and no action was taken", async () => {
    chat.mockReset().mockResolvedValue({ role: "assistant", content: "" });
    const r = await runAgent(AGENTS["SUIT.VOICE-EXEC"], "Mostrá la ruta", ctx);
    expect(r.text).toBe("");
    expect(r.actions).toEqual([]);
  });

  it("handleVoice escalates a silent fast agent and answers a silent BASE with the offline rules", async () => {
    chat.mockReset().mockResolvedValue({ role: "assistant", content: "" });
    const r = await handleVoice("Cuánto oxígeno me queda", ctx);
    expect(r.offline).toBe(true);
    expect(r.text.trim().length).toBeGreaterThan(0);
    expect(r.text).not.toMatch(/No action taken/);
  });
});
