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
    patterns: [
      /(?<![\p{L}])(emergencia|mayday|auxilio|emergency(?!\s+(?:exit|route|plan|procedure|drill|protocol))|urgence|notfall|emergenza)(?![\p{L}])/iu,
    ],
  },
  {
    id: "abort_eva",
    patterns: [
      /(?<![\p{L}])(abort(?:ar|á|o)?(?:\s+(?:the\s+mission|(?:la\s+)?eva))?|cancel(?:ar|o)?\s+(?:la\s+)?eva|annuler\s+(?:l['’])?eva|eva\s+abbrechen)(?![\p{L}])/iu,
    ],
  },
  {
    id: "stop_all",
    patterns: [
      /^[\s.,!¡?¿]*alto[\s.,!¡?¿]*$/i,
      /(?<![\p{L}])((?:det[eé]n(?:gan|er)?|par[ae]n?)\s+todo|stop\s+(?:all|everything)|all\s+stop|arr[êe]t(?:\s+de\s+tout)?|alles\s+stopp|ferma\s+tutto)(?![\p{L}])/iu,
    ],
  },
  {
    id: "open_map",
    patterns: [
      /(?<![\p{L}])(?:abr[aeií]r?|mostr(?:a|ar|ame)|mu[eé]str(?:a|ame)|open|show|ouvr(?:ir|e)|[oö]ffne(?:n)?|zeig(?:e|en)?|apr[ai](?:re)?)\s+(?:el\s+|la\s+|le\s+|die\s+|the\s+)?(?:mapa|map|carte|karte|mappa)(?![\p{L}])/iu,
      /(?<![\p{L}])karte\s+[oö]ffnen(?![\p{L}])/iu,
    ],
  },
  {
    id: "close_panel",
    patterns: [
      /(?<![\p{L}])(?:cerr[aá]r?|close|fermer|schlie(?:ss|ß)en|chiud[ei](?:re)?)\s+(?:el\s+|la\s+|le\s+|das\s+|il\s+|the\s+)?(?:panel|men[uú]|todo|all|tutto)(?![\p{L}])/iu,
      /(?<![\p{L}])(?:panel|men[uú]|alles)\s+schlie(?:ss|ß)en(?![\p{L}])/iu,
    ],
  },
  {
    id: "repeat",
    patterns: [
      /(?<![\p{L}])(repet[ií]r?|repit[ae]|repeat(?:\s+that)?|say\s+again|r[eé]p[eé]t(?:er|ez)|repeter|wiederholen|ripeti)(?![\p{L}])/iu,
    ],
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
