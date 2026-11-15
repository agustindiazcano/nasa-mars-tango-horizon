import { describe, expect, it } from "vitest";
import { matchLocalIntent, type LocalIntentId } from "../../../../web/src/voice/localIntents.js";
import { isVisionQuestion, parseVisionIntent } from "../../../../web/src/voice/visionIntent.js";

const LOCAL_INTENT_CASES: Array<[string, LocalIntentId | null]> = [
  ["emergencia", "emergency"],
  ["¡EMERGENCIA!", "emergency"],
  ["Mayday mayday", "emergency"],
  ["auxilio", "emergency"],
  ["Emergency!", "emergency"],
  ["urgence", "emergency"],
  ["Notfall", "emergency"],
  ["emergenza", "emergency"],
  ["tengo una emergencia", "emergency"],
  ["abortar", "abort_eva"],
  ["abortar EVA.", "abort_eva"],
  ["abort EVA", "abort_eva"],
  ["cancelar la EVA", "abort_eva"],
  ["annuler EVA", "abort_eva"],
  ["EVA abbrechen", "abort_eva"],
  ["abort the mission", "abort_eva"],
  ["abortá la eva", "abort_eva"],
  ["alto", "stop_all"],
  ["¡Alto!", "stop_all"],
  ["ALTO.", "stop_all"],
  ["detener todo", "stop_all"],
  ["detén todo", "stop_all"],
  ["stop all", "stop_all"],
  ["All stop", "stop_all"],
  ["arret", "stop_all"],
  ["arrêt de tout", "stop_all"],
  ["alles stopp", "stop_all"],
  ["ferma tutto", "stop_all"],
  ["stop everything", "stop_all"],
  ["paren todo", "stop_all"],
  ["abrir mapa", "open_map"],
  ["abrí el mapa", "open_map"],
  ["Open the map", "open_map"],
  ["show map", "open_map"],
  ["ouvrir la carte", "open_map"],
  ["Karte öffnen", "open_map"],
  ["apri la mappa", "open_map"],
  ["muestra el mapa", "open_map"],
  ["mostrame el mapa", "open_map"],
  ["cerrar panel", "close_panel"],
  ["cerrá el panel", "close_panel"],
  ["close panel", "close_panel"],
  ["fermer le panel", "close_panel"],
  ["chiudi tutto", "close_panel"],
  ["close all", "close_panel"],
  ["cerrar todo", "close_panel"],
  ["Panel schliessen", "close_panel"],
  ["repetí", "repeat"],
  ["repeat", "repeat"],
  ["Repeat that", "repeat"],
  ["say again", "repeat"],
  ["répéter", "repeat"],
  ["wiederholen", "repeat"],
  ["ripeti", "repeat"],
  ["repetir", "repeat"],
  ["repite", "repeat"],
  ["el punto más alto del cráter", null],
  ["subí al alto de la loma", null],
  ["how high is the ridge", null],
  ["abrí el panel de flota", null],
  ["repetidor de comunicaciones", null],
  ["the rover stopped all by itself", null],
  ["alto riesgo de tormenta", null],
  ["Está en alto", null],
  ["cancela la ruta", null],
  ["mostrame la capa térmica", null],
  ["what is the map scale", null],
  ["cerrar la puerta del rover", null],
  ["emergency exit route plan", null],
];

const VISION_CASES: Array<[string, boolean]> = [
  ["Rover 2, qué ves", true],
  ["¿Qué ve el rover dos?", true],
  ["What do you see", true],
  ["what does the rover see", true],
  ["read the sign", true],
  ["read that sign", true],
  ["leé el cartel", true],
  ["leer el cartel", true],
  ["mostrame la cámara del rover", true],
  ["show me the camera", true],
  ["show camera", true],
  ["ver cámara del rover 2", true],
  ["camera view", true],
  ["vista de la cámara", true],
  ["vista de camara", true],
  ["Rover two, what do you see?", true],
  ["qué ves?", true],
  ["que ves", true],
  ["what does rover 2 see", true],
  ["lee el cartel", true],
  ["muéstrame la cámara", true],
  ["mostrar camara", true],
  ["ver la camara", true],
  ["Rover dos, relevá la zona del norte", false],
  ["A qué velocidad va el rover", false],
  ["Rover two, go to site 3", false],
  ["que vehículo está más cerca", false],
  ["porque ves eso", false],
  ["design the route", false],
  ["Rover uno, seguime", false],
  ["Mostrá la capa térmica", false],
  ["How much oxygen do I have left", false],
  ["what do you think about the route", false],
  ["qué veloz es el rover", false],
  ["show the thermal layer", false],
  ["show me the map", false],
  ["planificá una ruta", false],
  ["qué vestimenta uso", false],
  ["sign the report", false],
  ["read the telemetry", false],
  ["the camera is far", false],
  ["drone uno despegá y fotografiá la zona", false],
  ["cómo están mis signos", false],
];

describe("Frontend pure voice intent matchers (Issues 8 & 12)", () => {
  it("matches all 69 localIntents positive and negative cases", () => {
    for (const [input, expected] of LOCAL_INTENT_CASES) {
      expect(matchLocalIntent(input), `input: ${JSON.stringify(input)}`).toBe(expected);
    }
  });

  it("matches all 43 vision question positive and negative cases", () => {
    for (const [input, expected] of VISION_CASES) {
      expect(isVisionQuestion(input), `input: ${JSON.stringify(input)}`).toBe(expected);
    }
  });

  it("parses helmet visor ('astronaut') and fleet unit IDs in parseVisionIntent (F17)", () => {
    expect(parseVisionIntent("¿podés ver lo que estoy viendo? qué es")).toEqual({
      isVision: true,
      unitId: "astronaut",
    });
    expect(parseVisionIntent("What am I seeing right in front of me?")).toEqual({
      isVision: true,
      unitId: "astronaut",
    });
    expect(parseVisionIntent("Qué ve el drone 1")).toEqual({
      isVision: true,
      unitId: "drone-1",
    });
    expect(parseVisionIntent("What does rover 3 see?")).toEqual({
      isVision: true,
      unitId: "rover-3",
    });
    expect(parseVisionIntent("the camera is dusty")).toEqual({
      isVision: false,
      unitId: null,
    });
  });

  it("matches open_menu, close_panel, hide_hud, and show_hud local intents (F18)", () => {
    expect(matchLocalIntent("open menu")).toBe("open_menu");
    expect(matchLocalIntent("abrir menu")).toBe("open_menu");
    expect(matchLocalIntent("abrí el menú")).toBe("open_menu");
    expect(matchLocalIntent("close menu")).toBe("close_panel");
    expect(matchLocalIntent("cierra el menu")).toBe("close_panel");
    expect(matchLocalIntent("cerrar")).toBe("close_panel");
    expect(matchLocalIntent("ocultar hud")).toBe("hide_hud");
    expect(matchLocalIntent("hide hud")).toBe("hide_hud");
    expect(matchLocalIntent("mostrar hud")).toBe("show_hud");
    expect(matchLocalIntent("show hud")).toBe("show_hud");
  });
});
