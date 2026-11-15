import { describe, expect, it, vi } from "vitest";
import type { MissionContext } from "../types.js";

vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => false,
  chat: vi.fn(),
}));

import { BASE_ORIGIN, CREW_ROSTER, RESCUE_SITE, type CrewLocation, type CrewSnapshot, type CrewStatus } from "@th/shared";
import { offlineReply } from "../offline.js";

function member(id: string, x: number, z: number, location: CrewLocation, status: CrewStatus = "nominal", unit_id?: string): CrewSnapshot {
  const m = CREW_ROSTER.find((c) => c.id === id)!;
  return { id: m.id, name: m.name, assignment: m.assignment, x, z, location, status, ...(unit_id ? { unit_id } : {}) };
}

function ctxOf(lang: MissionContext["lang"], overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    lang,
    met_s: 600,
    astronaut: { x: BASE_ORIGIN.x + 28, z: BASE_ORIGIN.z + 36, body_kg: 78, load_kg: 65, speed: 0 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2, o2_reserve_kg: 0.5 },
    leak_diameter_m: 0,
    env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 10 },
    crew: [
      member("crew-1", BASE_ORIGIN.x + 28, BASE_ORIGIN.z + 36, "base"),
      member("crew-4", BASE_ORIGIN.x + 8, BASE_ORIGIN.z + 7, "base"),
      member("crew-2", RESCUE_SITE.x + 5, RESCUE_SITE.z - 3, "traverse"),
      member("crew-3", RESCUE_SITE.x + 0.7, RESCUE_SITE.z + 0.7, "in_pit", "incapacitated"),
    ],
    fleet: [
      { id: "rescue-1", kind: "rescue", x: RESCUE_SITE.x - 13, z: RESCUE_SITE.z - 12, battery: 0.9, busy: false },
      { id: "rescue-bot-1", kind: "rescue_robot", x: RESCUE_SITE.x - 13, z: RESCUE_SITE.z - 12, battery: 0.9, busy: false },
      { id: "drone-1", kind: "drone", x: BASE_ORIGIN.x + 40, z: BASE_ORIGIN.z - 30, battery: 0.9, busy: false },
      { id: "drone-2", kind: "drone", x: BASE_ORIGIN.x - 60, z: BASE_ORIGIN.z + 55, battery: 0.9, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

describe("offline crew roster queries (EN/ES/FR/DE/IT)", () => {
  const cases: { lang: MissionContext["lang"]; text: string; has: string[]; hasNot?: string[] }[] = [
    { lang: "en", text: "Who is on the science expedition?", has: ["SALERNO", "DIAZ-CANO"], hasNot: ["YACONIS", "SOTELO"] },
    { lang: "es", text: "¿Quiénes están en la expedición científica?", has: ["SALERNO", "DIAZ-CANO", "Expedición científica"], hasNot: ["YACONIS"] },
    { lang: "fr", text: "Qui est dans l'expédition scientifique ?", has: ["SALERNO", "DIAZ-CANO"], hasNot: ["YACONIS"] },
    { lang: "de", text: "Wer ist in der Expedition?", has: ["SALERNO", "DIAZ-CANO"], hasNot: ["YACONIS"] },
    { lang: "it", text: "Chi è nella spedizione?", has: ["SALERNO", "DIAZ-CANO"], hasNot: ["YACONIS"] },
    { lang: "en", text: "Who is at the base?", has: ["SOTELO", "YACONIS"], hasNot: ["DIAZ-CANO"] },
    { lang: "es", text: "¿Quiénes están en la base?", has: ["SOTELO", "YACONIS"], hasNot: ["SALERNO"] },
    { lang: "fr", text: "Qui est à la base ?", has: ["SOTELO", "YACONIS"], hasNot: ["SALERNO"] },
    { lang: "de", text: "Wer ist an der Basis?", has: ["SOTELO", "YACONIS"], hasNot: ["SALERNO"] },
    { lang: "it", text: "Chi è alla base?", has: ["SOTELO", "YACONIS"], hasNot: ["SALERNO"] },
    { lang: "en", text: "Where is Salerno?", has: ["SALERNO", "on the traverse"], hasNot: ["DIAZ-CANO"] },
    { lang: "es", text: "¿Dónde está Yaconis?", has: ["YACONIS", "en la base"], hasNot: ["SALERNO"] },
    { lang: "fr", text: "Où est Salerno ?", has: ["SALERNO", "en traversée"] },
    { lang: "de", text: "Wo ist Sotelo?", has: ["SOTELO", "an der Basis"] },
    { lang: "it", text: "Dov'è Diaz-Cano?", has: ["DIAZ-CANO", "nel pozzo"] },
    { lang: "en", text: "How is Diaz-Cano?", has: ["DIAZ-CANO", "in the pit", "incapacitated"] },
    { lang: "es", text: "¿Cómo está Diaz-Cano?", has: ["DIAZ-CANO", "en el pozo", "incapacitado"] },
    { lang: "fr", text: "Comment va Diaz-Cano ?", has: ["DIAZ-CANO", "dans le puits"] },
    { lang: "de", text: "Wie geht es Diaz-Cano?", has: ["DIAZ-CANO", "im Schacht"] },
    { lang: "it", text: "Come sta Diaz-Cano?", has: ["DIAZ-CANO", "nel pozzo"] },
    { lang: "en", text: "Status of the astronauts", has: ["SOTELO", "YACONIS", "SALERNO", "DIAZ-CANO"] },
    { lang: "es", text: "Estado de los astronautas", has: ["SOTELO", "YACONIS", "SALERNO", "DIAZ-CANO", "Tripulación"] },
    { lang: "fr", text: "État des astronautes", has: ["SOTELO", "DIAZ-CANO"] },
    { lang: "de", text: "Status der Astronauten", has: ["SOTELO", "DIAZ-CANO"] },
    { lang: "it", text: "Stato degli astronauti", has: ["SOTELO", "DIAZ-CANO"] },
  ];

  for (const c of cases) {
    it(`${c.lang}: ${c.text}`, async () => {
      const out = await offlineReply(c.text, ctxOf(c.lang));
      expect(out.actions).toEqual([]);
      expect(out.trace.some((t) => t.kind === "tool" && (t.detail as { tool?: string }).tool === "get_crew_status")).toBe(true);
      for (const h of c.has) expect(out.speech, c.text).toContain(h);
      for (const h of c.hasNot ?? []) expect(out.speech, c.text).not.toContain(h);
      expect(out.speech).not.toMatch(/crew-\d/);
    });
  }

  it("does not hijack unit orders that mention the rover or the base", async () => {
    const out = await offlineReply("Rover uno, volvé a la base", ctxOf("es"));
    expect(out.trace.some((t) => (t.detail as { tool?: string }).tool === "get_crew_status")).toBe(false);
  });
});

describe("offline rescue orders", () => {
  it("rescues a named astronaut: dispatches rescue-1, two overwatch drones and asks before the robot", async () => {
    const out = await offlineReply("Rescata a Diaz-Cano", ctxOf("es"));
    const types = out.actions.map((a) => a.type);
    expect(types).toContain("dispatch");
    expect(types.filter((t) => t === "dispatch_overwatch")).toHaveLength(2);
    const robot = out.actions.find((a) => a.type === "deploy_rescue_robot");
    expect(robot?.verdict?.decision).toBe("ask_human");
    expect(out.speech).toContain("DIAZ-CANO");
  });

  it("deploys the rescue robot to the incapacitated astronaut when no name is given", async () => {
    const out = await offlineReply("Despliega el robot de rescate", ctxOf("es"));
    expect(out.actions.map((a) => a.type)).toEqual(["deploy_rescue_robot"]);
    expect(out.actions[0].args).toMatchObject({ target_id: "crew-3", carrier_id: "rescue-1" });
  });

  it("sends overwatch drones that keep the 25 m standoff from every crew member", async () => {
    const ctx = ctxOf("en");
    const out = await offlineReply("Send both drones to overwatch Diaz-Cano", ctx);
    const wps = out.actions.filter((a) => a.type === "dispatch_overwatch");
    expect(wps).toHaveLength(2);
    for (const a of wps) {
      for (const c of ctx.crew!) {
        expect(Math.hypot((a.args.x as number) - c.x, (a.args.z as number) - c.z)).toBeGreaterThanOrEqual(25);
      }
      expect(a.verdict?.decision).toBe("allow");
    }
  });

  it("reports GUARDIAN denials when dust grounds the drones", async () => {
    const base = ctxOf("en");
    const out = await offlineReply("Drones overwatch the casualty", { ...base, env: { ...base.env, tau: 2.5 } });
    expect(out.actions).toEqual([]);
    expect(out.speech).toMatch(/grounding limit/);
  });

  it("answers in each language", async () => {
    for (const [lang, text, word] of [
      ["fr", "Secours pour Diaz-Cano", "actions approuvées"],
      ["de", "Rette Diaz-Cano", "Aktionen genehmigt"],
      ["it", "Soccorri Diaz-Cano", "azioni approvate"],
    ] as const) {
      const out = await offlineReply(text, ctxOf(lang));
      expect(out.speech, text).toContain(word);
    }
  });
});
