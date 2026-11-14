export type LocalIntentId =
  | "emergency"
  | "abort_eva"
  | "stop_all"
  | "open_map"
  | "close_panel"
  | "repeat";

export interface LocalIntentDef {
  id: LocalIntentId;
  patterns: RegExp[];
}

export const LOCAL_INTENTS: LocalIntentDef[] = [
  {
    id: "emergency",
    patterns: [/\b(emergencia|mayday|auxilio|emergency|urgence|notfall|emergenza)\b/i],
  },
  {
    id: "abort_eva",
    patterns: [/\b(abort(ar|o)?|cancel(ar|o)? (la )?eva|abort eva|annuler eva|eva abbrechen)\b/i],
  },
  {
    id: "stop_all",
    patterns: [/\b(alto|det[eé]n(gan|er)? todo|stop all|all stop|arret|alles stopp|ferma tutto)\b/i],
  },
  {
    id: "open_map",
    patterns: [/\b(abr[ií]r?|mostr[aá]r?|open|show) (el )?(mapa|map|carte|karte|mappa)\b/i],
  },
  {
    id: "close_panel",
    patterns: [/\b(cerr[aá]r?|close|fermer|schliessen|chiudi) (el )?(panel|men[uú]|todo|all)\b/i],
  },
  {
    id: "repeat",
    patterns: [/\b(repet[ií]|repeat|say again|repeter|wiederholen|ripeti)\b/i],
  },
];

export function matchLocalIntent(text: string): LocalIntentId | null {
  for (const intent of LOCAL_INTENTS) {
    if (intent.patterns.some((p) => p.test(text))) {
      return intent.id;
    }
  }
  return null;
}
