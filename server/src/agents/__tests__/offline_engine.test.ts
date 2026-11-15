import { describe, expect, it } from "vitest";
import { offlineReply, parseSpokenNumber } from "../offline.js";
import type { Lang, MissionContext } from "../types.js";

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    lang: "es",
    met_s: 600,
    astronaut: { x: -160, z: -280, body_kg: 78, load_kg: 65, speed: 0 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2, o2_reserve_kg: 0.5 },
    leak_diameter_m: 0,
    env: {
      pressure_pa: 750,
      air_temp_k: 220,
      tau: 0.5,
      wind_ms: 6,
      dose_rate_ugy_h: 10,
    },
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: -120, z: -300, battery: 0.8, busy: false },
      { id: "rescue-1", kind: "rescue", x: -190, z: -300, battery: 0.9, busy: false },
      { id: "manip-1", kind: "manipulator", x: -150, z: -270, battery: 0.9, busy: false },
      { id: "drone-1", kind: "drone", x: -170, z: -290, battery: 0.85, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    targets: [{ id: "T1", kind: "rock", x: -151, z: -271 }],
    ...overrides,
  };
}

describe("offlineReply fixes (Issue 10)", () => {
  it("matches 'manipulator' and 'manipulador' to arm_skill without stealing drone photo orders", async () => {
    const enRes = await offlineReply("Manipulator, grab rock T1", makeContext({ lang: "en" }));
    expect(enRes.actions.some((a) => a.type === "arm_skill" && a.args.unit_id === "manip-1")).toBe(true);

    const esRes = await offlineReply("Manipulador, agarrá la roca T1", makeContext({ lang: "es" }));
    expect(esRes.actions.some((a) => a.type === "arm_skill" && a.args.unit_id === "manip-1")).toBe(true);
  });

  it("matches plural 'balizas' and 'beacons'", async () => {
    const esRes = await offlineReply("Desplegá balizas hacia la base", makeContext({ lang: "es" }));
    expect(esRes.actions.some((a) => a.type === "deploy_beacons")).toBe(true);

    const enRes = await offlineReply("Deploy breadcrumb beacons to base", makeContext({ lang: "en" }));
    expect(enRes.actions.some((a) => a.type === "deploy_beacons")).toBe(true);
  });

  it("parses spoken coordinate numbers instead of falling back to S2", async () => {
    expect(parseSpokenNumber("cien")).toBe(100);
    expect(parseSpokenNumber("menos doscientos")).toBe(-200);
    expect(parseSpokenNumber("one hundred")).toBe(100);
    expect(parseSpokenNumber("minus two hundred")).toBe(-200);

    const esRes = await offlineReply("Planificá ruta a cien, menos doscientos", makeContext({ lang: "es" }));
    const routeAct = esRes.actions.find((a) => a.type === "show_route");
    expect(routeAct?.args).toEqual({ to_x: 100, to_z: -200 });

    const enRes = await offlineReply("Plan route to one hundred, minus two hundred", makeContext({ lang: "en" }));
    const enRoute = enRes.actions.find((a) => a.type === "show_route");
    expect(enRoute?.args).toEqual({ to_x: 100, to_z: -200 });
  });

  it("executes unit_action for drone, rover follow, and rescue return-to-base", async () => {
    const droneRes = await offlineReply("Drone uno, despegá y fotografiá la zona al este", makeContext({ lang: "es" }));
    const types = droneRes.actions.map((a) => `${a.type}:${a.args.unit_id}:${a.args.action}`);
    expect(types).toContain("unit_action:drone-1:takeoff");
    expect(types).toContain("unit_action:drone-1:photograph_area");
    expect(droneRes.actions.some((a) => a.type === "arm_skill")).toBe(false);

    const followRes = await offlineReply("Rover uno, seguime", makeContext({ lang: "es" }));
    expect(followRes.actions.some((a) => a.type === "unit_action" && a.args.unit_id === "rover-1" && a.args.action === "follow_astronaut")).toBe(true);

    const rescueReturn = await offlineReply("Rescue uno, volvé a la base", makeContext({ lang: "es" }));
    expect(rescueReturn.actions.some((a) => a.type === "unit_action" && a.args.unit_id === "rescue-1" && a.args.action === "return_to_base")).toBe(true);
    expect(rescueReturn.actions.some((a) => a.type === "launch_pod")).toBe(false);
  });

  it("localizes HUD layer and panel names in Spanish without mixing English", async () => {
    const layerRes = await offlineReply("Cambiá a capa térmica", makeContext({ lang: "es" }));
    expect(layerRes.speech).toBe("Capa térmica activada.");
    expect(layerRes.actions[0]?.type).toBe("set_layer");

    const panelRes = await offlineReply("Abrí el panel de flota", makeContext({ lang: "es" }));
    expect(panelRes.speech).toBe("Panel flota abierto.");
    expect(panelRes.actions[0]?.type).toBe("open_panel");
  });

  it("replies in fr, de, and it instead of falling back to English", async () => {
    const cases: { lang: Lang; prompt: string; expected: RegExp }[] = [
      { lang: "fr", prompt: "Statut oxygène de la combinaison", expected: /Combinaison .* restantes/i },
      { lang: "de", prompt: "Anzug Sauerstoff Status", expected: /Anzug .* übrig/i },
      { lang: "it", prompt: "Stato ossigeno tuta", expected: /Tuta .* rimanenti/i },
    ];
    for (const c of cases) {
      const res = await offlineReply(c.prompt, makeContext({ lang: c.lang }));
      expect(res.speech).toMatch(c.expected);
    }
  });

  it("answers conversational fleet count, unit position, ambient weather, and pod calculation on SUIT.VOICE-EXEC without physical actions (B38)", async () => {
    const ctx = makeContext({ lang: "es" });

    const countRes = await offlineReply("Cuántos vehículos hay en la flota", ctx);
    expect(countRes.route).toEqual(["SUIT.VOICE-EXEC"]);
    expect(countRes.actions).toHaveLength(0);
    expect(countRes.speech).toMatch(/4 vehículos/i);

    const posRes = await offlineReply("Dónde está el rover 1", ctx);
    expect(posRes.route).toEqual(["SUIT.VOICE-EXEC"]);
    expect(posRes.actions).toHaveLength(0);
    expect(posRes.speech).toMatch(/rover-1.*batería/i);

    const wxRes = await offlineReply("Qué temperatura y viento hay", ctx);
    expect(wxRes.route).toEqual(["SUIT.VOICE-EXEC"]);
    expect(wxRes.actions).toHaveLength(0);
    expect(wxRes.speech).toMatch(/220 K.*6 m\/s/i);

    const calcRes = await offlineReply("Calculá la trayectoria del pod de soporte vital", ctx);
    expect(calcRes.route).toEqual(["SUIT.VOICE-EXEC"]);
    expect(calcRes.actions).toHaveLength(0);
    expect(calcRes.speech).toMatch(/RK4/i);
  });
});
