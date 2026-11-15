import { describe, expect, it } from "vitest";
import { LOCAL_INTENTS, matchLocalIntent, type LocalIntentId } from "./localIntents";

describe("localIntents (web-test-3d)", () => {
  it("defines all 6 critical local intent categories", () => {
    expect(LOCAL_INTENTS.map((d) => d.id)).toEqual([
      "emergency",
      "abort_eva",
      "stop_all",
      "open_map",
      "close_panel",
      "repeat",
    ]);
  });

  const positiveCases: Array<[string, LocalIntentId]> = [
    // emergency (EN / ES / FR / DE / IT)
    ["Emergency!", "emergency"],
    ["Mayday mayday", "emergency"],
    ["emergencia", "emergency"],
    ["¡Auxilio!", "emergency"],
    ["urgence médicale", "emergency"],
    ["Notfall!", "emergency"],
    ["emergenza tuta", "emergency"],

    // abort_eva (EN / ES / FR / DE / IT + boundaries)
    ["abort EVA", "abort_eva"],
    ["abort the mission", "abort_eva"],
    ["abortar EVA.", "abort_eva"],
    ["cancelar la EVA", "abort_eva"],
    ["annuler l'eva", "abort_eva"],
    ["EVA abbrechen", "abort_eva"],

    // stop_all (EN / ES / FR / DE / IT)
    ["stop all", "stop_all"],
    ["stop everything", "stop_all"],
    ["All stop", "stop_all"],
    ["alto", "stop_all"],
    ["¡Alto!", "stop_all"],
    ["detener todo", "stop_all"],
    ["paren todo", "stop_all"],
    ["arrêt de tout", "stop_all"],
    ["alles stopp", "stop_all"],
    ["ferma tutto", "stop_all"],

    // open_map (EN / ES / FR / DE / IT)
    ["open map", "open_map"],
    ["show the map", "open_map"],
    ["abrir mapa", "open_map"],
    ["mostrame el mapa", "open_map"],
    ["ouvrir la carte", "open_map"],
    ["Karte öffnen", "open_map"],
    ["apri la mappa", "open_map"],

    // close_panel (EN / ES / FR / DE / IT)
    ["close panel", "close_panel"],
    ["close all", "close_panel"],
    ["cerrar el panel", "close_panel"],
    ["cerrar todo", "close_panel"],
    ["fermer le panel", "close_panel"],
    ["Panel schließen", "close_panel"],
    ["chiudi tutto", "close_panel"],

    // repeat (EN / ES / FR / DE / IT)
    ["repeat", "repeat"],
    ["Repeat that", "repeat"],
    ["say again", "repeat"],
    ["repetir", "repeat"],
    ["repita", "repeat"],
    ["répéter", "repeat"],
    ["wiederholen", "repeat"],
    ["ripeti", "repeat"],
  ];

  it.each(positiveCases)("matches %j -> %s", (phrase, expected) => {
    expect(matchLocalIntent(phrase)).toBe(expected);
  });

  const falsePositiveBoundaries: string[] = [
    // EN boundaries & negative lookaheads
    "emergency exit route plan",
    "emergency drill checklist",
    "emergency procedure status",
    "the rover stopped all by itself",
    "what is the map scale",
    "open the health panel",
    "close the airlock door",
    "repeater link nominal",

    // ES boundaries
    "el punto más alto del cráter",
    "alto riesgo de tormenta",
    "está en alto",
    "abrí el panel de flota",
    "mostrame la capa térmica",
    "cancela la ruta",
    "cerrar la puerta del rover",
    "repetidor de comunicaciones",

    // FR boundaries
    "urgences médicales archivées",
    "ouvrir le panneau santé",
    "fermer le sas",
    "répéteur radio actif",

    // DE boundaries
    "Notfallplan prüfen",
    "Tür schließen",
    "Wiederholungsrate prüfen",
    "die Karte zeigen wir später nicht",

    // IT boundaries
    "stato emergenziale archiviato",
    "apri la porta del modulo",
    "chiudi la valvola",
    "ripetitore radio attivo",
  ];

  it.each(falsePositiveBoundaries)("rejects non-intent boundary phrase %j", (phrase) => {
    expect(matchLocalIntent(phrase)).toBeNull();
  });
});
