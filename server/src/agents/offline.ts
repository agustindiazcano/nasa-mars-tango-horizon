import { MAX_SLOPE, ruleCheck } from "./guardian.js";
import { callTool, missionScope, startMcpServers } from "./tools/mcp.js";
import { TOOLS } from "./tools/registry.js";
import { nearestSafePoint } from "./tools/terrainData.js";
import type { UnitActionId } from "./unitCapabilities.js";
import type { Action, ConversationTurn, Lang, MissionContext, ToolDef, TraceEvent } from "./types.js";

export interface OfflineResult {
  speech: string;
  actions: Action[];
  trace: TraceEvent[];
  route: string[];
}

const SITE_COORDS: Record<number, { x: number; z: number; name: string }> = {
  1: { x: 250, z: -180, name: "S1" },
  2: { x: 480, z: 320, name: "S2" },
  3: { x: -420, z: 390, name: "S3" },
  4: { x: 720, z: -450, name: "S4" },
};

function toolByName(name: string): ToolDef {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`Unknown tool: ${name}`);
  return t;
}

async function execRead(
  name: string,
  args: Record<string, unknown>,
  ctx: MissionContext,
  caller: string,
  trace: TraceEvent[],
): Promise<any> {
  const t = toolByName(name);
  const res = await missionScope.run({ ctx, caller }, () => callTool(t, args));
  trace.push({ t: Date.now(), agent: caller, kind: "tool", detail: { tool: name, args } });
  return res;
}

function proposeAction(
  name: string,
  args: Record<string, unknown>,
  ctx: MissionContext,
  caller: string,
  actions: Action[],
  trace: TraceEvent[],
): Action {
  const action: Action = { type: name, args, proposedBy: caller };
  trace.push({ t: Date.now(), agent: caller, kind: "tool", detail: { tool: name, args } });
  const verdict = ruleCheck(action, ctx) ?? {
    decision: "allow" as const,
    reason: "Offline safety rule check passed",
    by: "rules" as const,
  };
  action.verdict = verdict;
  trace.push({ t: Date.now(), agent: "GUARDIAN", kind: "verdict", detail: action });
  if (verdict.decision === "allow" || verdict.decision === "ask_human") {
    actions.push(action);
  }
  return action;
}

function pick(lang: Lang, msgs: Record<Lang, string>): string {
  return msgs[lang] ?? msgs.en;
}

const LAYER_LABELS: Record<string, Record<Lang, string>> = {
  thermal: { es: "térmica", en: "thermal", fr: "thermique", de: "Thermik", it: "termica" },
  slope: { es: "pendiente", en: "slope", fr: "pente", de: "Neigung", it: "pendenza" },
  radiation: { es: "radiación", en: "radiation", fr: "rayonnement", de: "Strahlung", it: "radiazione" },
  hydration: { es: "hidratación", en: "hydration", fr: "hydratation", de: "Hydratation", it: "idratazione" },
  optical: { es: "óptica", en: "optical", fr: "optique", de: "Optik", it: "ottica" },
};

const PANEL_LABELS: Record<string, Record<Lang, string>> = {
  map: { es: "mapa", en: "map", fr: "carte", de: "Karte", it: "mappa" },
  fleet: { es: "flota", en: "fleet", fr: "flotte", de: "Flotte", it: "flotta" },
  agents: { es: "agentes", en: "agents", fr: "agents", de: "Agenten", it: "agenti" },
  health: { es: "salud", en: "health", fr: "santé", de: "Gesundheit", it: "salute" },
  provenance: { es: "procedencia", en: "provenance", fr: "provenance", de: "Herkunft", it: "provenienza" },
};

const SPOKEN_ONES: Record<string, number> = {
  cero: 0, zero: 0, zéro: 0, null: 0,
  uno: 1, un: 1, una: 1, one: 1, eins: 1, eine: 1,
  dos: 2, two: 2, deux: 2, zwei: 2, due: 2,
  tres: 3, three: 3, trois: 3, drei: 3, tre: 3,
  cuatro: 4, four: 4, quatre: 4, vier: 4, quattro: 4,
  cinco: 5, five: 5, cinq: 5, fünf: 5, cinque: 5,
  seis: 6, six: 6, sechs: 6, sei: 6,
  siete: 7, seven: 7, sept: 7, sieben: 7, sette: 7,
  ocho: 8, eight: 8, huit: 8, acht: 8, otto: 8,
  nueve: 9, nine: 9, neuf: 9, neun: 9, nove: 9,
  diez: 10, ten: 10, dix: 10, zehn: 10, dieci: 10,
  once: 11, eleven: 11, onze: 11, elf: 11, undici: 11,
  doce: 12, twelve: 12, douze: 12, zwölf: 12, dodici: 12,
  trece: 13, thirteen: 13, treize: 13, dreizehn: 13, tredici: 13,
  catorce: 14, fourteen: 14, quatorze: 14, vierzehn: 14, quattordici: 14,
  quince: 15, fifteen: 15, quinze: 15, fünfzehn: 15, quindici: 15,
  dieciseis: 16, dieciséis: 16, sixteen: 16, seize: 16, sechzehn: 16, sedici: 16,
  diecisiete: 17, seventeen: 17, siebzehn: 17, diciassette: 17,
  dieciocho: 18, eighteen: 18, achtzehn: 18, diciotto: 18,
  diecinueve: 19, nineteen: 19, neunzehn: 19, diciannove: 19,
  veinte: 20, twenty: 20, vingt: 20, zwanzig: 20, venti: 20,
  veintiuno: 21, veintidos: 22, veintidós: 22, veintitres: 23, veintitrés: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintiséis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, thirty: 30, trente: 30, dreißig: 30, dreissig: 30, trenta: 30,
  cuarenta: 40, forty: 40, quarante: 40, vierzig: 40, quaranta: 40,
  cincuenta: 50, fifty: 50, cinquante: 50, fünfzig: 50, cinquanta: 50,
  sesenta: 60, sixty: 60, soixante: 60, sechzig: 60, sessanta: 60,
  setenta: 70, seventy: 70, septante: 70, siebzig: 70, settanta: 70,
  ochenta: 80, eighty: 80, huitante: 80, achtzig: 80, ottanta: 80,
  noventa: 90, ninety: 90, nonante: 90, neunzig: 90, novanta: 90,
};

const SPOKEN_HUNDREDS: Record<string, number> = {
  cien: 100, ciento: 100, cent: 100, hundert: 100, cento: 100,
  doscientos: 200, doscientas: 200, duecento: 200,
  trescientos: 300, trescientas: 300, trecento: 300,
  cuatrocientos: 400, cuatrocientas: 400, quattrocento: 400,
  quinientos: 500, quinientas: 500, cinquecento: 500,
  seiscientos: 600, seiscientas: 600, seicento: 600,
  setecientos: 700, setecientas: 700, settecento: 700,
  ochocientos: 800, ochocientas: 800, ottocento: 800,
  novecientos: 900, novecientas: 900, novecento: 900,
};

/** Parses a numeric literal or short spoken number phrase (EN/ES/FR/DE/IT), returning null if invalid. */
export function parseSpokenNumber(raw: string): number | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^(a|al|to|zu|vers|verso)\s+/i, "")
    .replace(/^(las?\s+)?coordenadas?\s+/i, "")
    .trim();
  if (!cleaned) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) return Number(cleaned);

  const tokens = cleaned
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((tok) => tok && tok !== "y" && tok !== "and" && tok !== "et" && tok !== "und" && tok !== "e");
  if (!tokens.length) return null;

  let sign = 1;
  if (tokens[0] === "menos" || tokens[0] === "minus" || tokens[0] === "moins" || tokens[0] === "meno" || tokens[0] === "negativo" || tokens[0] === "negative") {
    sign = -1;
    tokens.shift();
  }
  if (!tokens.length) return null;
  if (tokens.length === 1 && /^-?\d+(?:\.\d+)?$/.test(tokens[0])) {
    return sign * Number(tokens[0]);
  }

  let total = 0;
  let current = 0;
  let parsedAny = false;

  for (const tok of tokens) {
    if (tok === "hundred" || tok === "ciento" || tok === "cien" || tok === "cent" || tok === "hundert" || tok === "cento") {
      if (current > 0 && current < 10) {
        current *= 100;
      } else if (current === 0) {
        current = 100;
      } else {
        return null;
      }
      parsedAny = true;
    } else if (tok === "thousand" || tok === "mil" || tok === "mille" || tok === "tausend" || tok === "mila") {
      current = (current || 1) * 1000;
      total += current;
      current = 0;
      parsedAny = true;
    } else if (SPOKEN_HUNDREDS[tok] !== undefined) {
      current += SPOKEN_HUNDREDS[tok];
      parsedAny = true;
    } else if (SPOKEN_ONES[tok] !== undefined) {
      current += SPOKEN_ONES[tok];
      parsedAny = true;
    } else {
      return null;
    }
  }

  return parsedAny ? sign * (total + current) : null;
}

function parseSpokenCoords(q: string): { x: number; z: number } | null {
  const numLit = q.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
  if (numLit) {
    return { x: Number(numLit[1]), z: Number(numLit[2]) };
  }
  const afterPrep = q.match(/^.*\b(?:a|al|hacia|hasta|to|towards|vers|nach|zu|zur|verso|coordenadas?|coords?|punto|point)\s+(.+)$/i);
  const tail = (afterPrep ? afterPrep[1] : q).replace(/[.?¡!¿]+$/g, "").trim();
  const sep = tail.split(/\s*[,;]\s*|\s+(?:coma|comma)\s+/i);
  if (sep.length === 2) {
    const x = parseSpokenNumber(sep[0]);
    const z = parseSpokenNumber(sep[1]);
    if (x !== null && z !== null) return { x, z };
  }
  return null;
}

function matchExplicitSiteTarget(q: string): { x: number; z: number; label: string } | null {
  const numMatch = q.match(
    /(?<![\p{L}\d])(?:sitio|site|estaci[oó]n|station|standort|sito|s)\s*[-#]?\s*(1|2|3|4|uno|un|one|eins|dos|two|deux|zwei|due|tres|three|trois|drei|tre|cuatro|four|quatre|vier|quattro)(?![\p{L}\d])/iu,
  );
  if (numMatch) {
    const word = numMatch[1].toLowerCase();
    const map: Record<string, number> = {
      "1": 1, uno: 1, un: 1, one: 1, eins: 1,
      "2": 2, dos: 2, two: 2, deux: 2, zwei: 2, due: 2,
      "3": 3, tres: 3, three: 3, trois: 3, drei: 3, tre: 3,
      "4": 4, cuatro: 4, four: 4, quatre: 4, vier: 4, quattro: 4,
    };
    const site = SITE_COORDS[map[word] ?? 2];
    return { x: site.x, z: site.z, label: site.name };
  }
  const coords = parseSpokenCoords(q);
  if (coords) {
    return { x: coords.x, z: coords.z, label: `(${coords.x}, ${coords.z})` };
  }
  if (/\b(base|hab|habitat|refugio|shelter|abri|unterkunft|rifugio)\b/i.test(q)) {
    return { x: 0, z: 0, label: "Base" };
  }
  return null;
}

function parseSiteTarget(
  q: string,
  ctx?: MissionContext,
  history: ConversationTurn[] = [],
): { x: number; z: number; label: string } {
  const lang = ctx?.lang ?? "en";
  if (
    ctx &&
    /(?:^|\s)(mi posici[oó]n|mi ubicaci[oó]n|d[oó]nde estoy|ad[oó]nde estoy|hacia m[ií]|conmigo|a mi lado|my position|my location|where i am|to me|here|ma position|vers moi|ici|meine position|zu mir|hier|la mia posizione|da me|qui)(?=$|\s|[.,;!?])/i.test(
      q,
    )
  ) {
    const ax = Math.round(ctx.astronaut.x);
    const az = Math.round(ctx.astronaut.z);
    return {
      x: ax,
      z: az,
      label: pick(lang, {
        es: `tu posición (${ax}, ${az})`,
        en: `your position (${ax}, ${az})`,
        fr: `votre position (${ax}, ${az})`,
        de: `deine Position (${ax}, ${az})`,
        it: `tua posizione (${ax}, ${az})`,
      }),
    };
  }
  const explicit = matchExplicitSiteTarget(q);
  if (explicit) return explicit;
  if (/\b(there|all[ií]|ah[ií]|all[aá]|l[aà]|dort|l[iì])\b/i.test(q)) {
    for (let i = history.length - 1; i >= 0; i--) {
      const fromHistory = matchExplicitSiteTarget(history[i].content);
      if (fromHistory) return fromHistory;
    }
  }
  return { x: SITE_COORDS[2].x, z: SITE_COORDS[2].z, label: "S2" };
}

function matchExplicitUnitId(q: string): string | null {
  const direct = q.match(/\b(rover-[123]|scout-[12]|rescue-1|drone-[12]|glider-1|manip-1)\b/i);
  if (direct) return direct[1].toLowerCase();
  if (/\b(hands|manip(?:ulador|ulator)?|brazo|arm)\b/i.test(q)) return "manip-1";
  if (/\b(rescate|rescue)(?:\s*(?:uno|one|1))?\b/i.test(q)) return "rescue-1";
  if (/\b(glider|planeador|planeur|segler|aliante)\b/i.test(q)) return "glider-1";
  if (/\bscout\s*(?:dos|two|deux|zwei|due|2)\b/i.test(q)) return "scout-2";
  if (/\bscout(?:\s*(?:uno|one|un|eins|1))?\b/i.test(q)) return "scout-1";
  if (/\bdron(?:e|a)?\s*(?:dos|two|deux|zwei|due|2)\b/i.test(q)) return "drone-2";
  if (/\bdron(?:e|a)?(?:\s*(?:uno|one|un|eins|1))?\b/i.test(q)) return "drone-1";
  if (/\b(rover\s*(?:dos|two|deux|zwei|due|2)|rvr-2)\b/i.test(q)) return "rover-2";
  if (/\b(rover\s*(?:tres|three|trois|drei|tre|3)|rvr-3)\b/i.test(q)) return "rover-3";
  if (/\b(rover(?:\s*(?:uno|one|un|eins|1))?|rvr-1)\b/i.test(q)) return "rover-1";
  return null;
}

function parseUnitId(q: string, ctx: MissionContext, history: ConversationTurn[] = []): string | null {
  const explicit = matchExplicitUnitId(q);
  if (explicit) return explicit;
  for (let i = history.length - 1; i >= 0; i--) {
    const fromHistory = matchExplicitUnitId(history[i].content);
    if (fromHistory) return fromHistory;
  }
  return ctx.fleet[0]?.id ?? null;
}

function parseHeading(q: string): "north" | "east" | "south" | "west" | undefined {
  if (/\b(norte|north|nord|norden)\b/i.test(q)) return "north";
  if (/\b(este|east|est|osten|est)\b/i.test(q)) return "east";
  if (/\b(sur|south|sud|süden|sueden)\b/i.test(q)) return "south";
  if (/\b(oeste|west|ouest|westen|ovest)\b/i.test(q)) return "west";
  return undefined;
}

function localizedUnitActionDesc(action: UnitActionId, unitId: string, lang: Lang, heading?: string): string {
  const hStr = heading ? ` (${heading})` : "";
  const map: Record<UnitActionId, Record<Lang, string>> = {
    takeoff: {
      es: `${unitId} despegando`,
      en: `${unitId} taking off`,
      fr: `${unitId} en décollage`,
      de: `${unitId} hebt ab`,
      it: `${unitId} in decollo`,
    },
    land: {
      es: `${unitId} aterrizando`,
      en: `${unitId} landing`,
      fr: `${unitId} en atterrissage`,
      de: `${unitId} landet`,
      it: `${unitId} in atterraggio`,
    },
    photograph_area: {
      es: `${unitId} fotografiando zona${hStr}`,
      en: `${unitId} photographing area${hStr}`,
      fr: `${unitId} photographie la zone${hStr}`,
      de: `${unitId} fotografiert Bereich${hStr}`,
      it: `${unitId} fotografa l'area${hStr}`,
    },
    hover_overwatch: {
      es: `${unitId} en sobrevuelo de vigilancia`,
      en: `${unitId} hovering on overwatch`,
      fr: `${unitId} en vol stationnaire de surveillance`,
      de: `${unitId} schwebt zur Überwachung`,
      it: `${unitId} in sorvolo di sorveglianza`,
    },
    follow_astronaut: {
      es: `${unitId} siguiéndote a 5 m`,
      en: `${unitId} following you at 5 m`,
      fr: `${unitId} vous suit à 5 m`,
      de: `${unitId} folgt dir im Abstand von 5 m`,
      it: `${unitId} ti segue a 5 m`,
    },
    return_to_base: {
      es: `${unitId} regresando a la base`,
      en: `${unitId} returning to base`,
      fr: `${unitId} retourne à la base`,
      de: `${unitId} kehrt zur Basis zurück`,
      it: `${unitId} sta tornando alla base`,
    },
    survey_area: {
      es: `${unitId} relevando la zona${hStr}`,
      en: `${unitId} surveying area${hStr}`,
      fr: `${unitId} inspecte la zone${hStr}`,
      de: `${unitId} erkundet den Bereich${hStr}`,
      it: `${unitId} ispeziona l'area${hStr}`,
    },
    hold_position: {
      es: `${unitId} manteniendo posición`,
      en: `${unitId} holding position`,
      fr: `${unitId} maintient sa position`,
      de: `${unitId} hält Position`,
      it: `${unitId} mantiene la posizione`,
    },
    relay_comms: {
      es: `${unitId} desplegándose como repetidor UWB`,
      en: `${unitId} deploying as UWB relay`,
      fr: `${unitId} déployé comme relais UWB`,
      de: `${unitId} als UWB-Relais eingesetzt`,
      it: `${unitId} in posizione come ripetitore UWB`,
    },
    deliver_supplies: {
      es: `${unitId} llevando suministros a 5 m`,
      en: `${unitId} delivering supplies to 5 m stand-off`,
      fr: `${unitId} livre le ravitaillement à 5 m`,
      de: `${unitId} liefert Vorräte bis 5 m Abstand`,
      it: `${unitId} consegna i rifornimenti a 5 m`,
    },
  };
  return pick(lang, map[action]);
}

/**
 * Deterministic rule-based offline engine covering all demo deck orders, safety checks,
 * science queries, manipulator skills, unit actions, and weather evaluations when LLM link is unavailable.
 */
export async function offlineReply(
  text: string,
  ctx: MissionContext,
  history: ConversationTurn[] = [],
): Promise<OfflineResult> {
  await startMcpServers();

  const q = text.toLowerCase();
  const actions: Action[] = [];
  const trace: TraceEvent[] = [];
  const lang = ctx.lang;

  const isExplicitUnitOrderToRescue =
    /(?<![\p{L}\d])(rescue|rescate)(?:\s*(?:uno|one|1|-1))?(?![\p{L}\d])/iu.test(q) &&
    /(?<![\p{L}\d])(volv[\p{L}]*|regres[\p{L}]*|return|base|trae[\p{L}]*|bring|deliver|suministr[\p{L}]*|ox[ií]geno|oxygen|segu[\p{L}]*|follow|qu[eé]date|quedate|hold|repetidor|relay)(?![\p{L}\d])/iu.test(
      q,
    ) &&
    !/(?<![\p{L}\d])(emergenc[\p{L}]*|fuga|leak|mayday|socorro|auxilio|urgence|notfall|emergenza)(?![\p{L}\d])/iu.test(q);

  // 1. Suit leak / emergency rescue
  if (
    !isExplicitUnitOrderToRescue &&
    (/\b(emergencia|emergency|fuga|leak|mayday|socorro|auxilio|urgence|notfall|emergenza|rescat[aá]me|rescue me|send rescue)\b/i.test(q) ||
      (ctx.leak_diameter_m > 0 && /\b(ayuda|help|base|aide|hilfe|aiuto)\b/i.test(q)))
  ) {
    const caller = "BASE";
    const route = ["SUIT.VOICE-EXEC", "BASE"];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });

    const hypoxia = await execRead("time_to_hypoxia", {}, ctx, caller, trace);
    const critSec = ctx.leak_diameter_m > 0 && hypoxia?.toCriticalS !== undefined ? Math.round(hypoxia.toCriticalS) : null;
    const alertText =
      critSec !== null
        ? pick(lang, {
            es: `FUGA EN TRAJE: pérdida de conciencia en ${critSec} s`,
            en: `SUIT LEAK: loss of consciousness in ${critSec} s`,
            fr: `FUITE COMBINAISON : perte de connaissance dans ${critSec} s`,
            de: `ANZUG-LECK: Bewusstlosigkeit in ${critSec} s`,
            it: `PERDITA TUTA: incoscienza in ${critSec} s`,
          })
        : pick(lang, {
            es: "Protocolo de emergencia activado",
            en: "Emergency rescue protocol active",
            fr: "Protocole d'urgence activé",
            de: "Notfallrettungsprotokoll aktiv",
            it: "Protocollo di emergenza attivo",
          });

    proposeAction("show_alert", { level: "crit", text: alertText.slice(0, 140) }, ctx, caller, actions, trace);
    proposeAction(
      "launch_pod",
      {
        target_x: Math.round(ctx.astronaut.x + 25),
        target_z: Math.round(ctx.astronaut.z),
        payload: "full_life_support",
        mass_kg: 8.0,
        breakdown_kg: {
          o2_copv_total_kg: 4.0,
          o2_usable_gas_kg: 1.0,
          co2_scrubber_lioh_kg: 1.2,
          battery_thermal_pack_kg: 1.0,
          suit_breach_patch_kit_kg: 0.35,
          aeroshell_chute_beacon_kg: 1.45,
        },
        chute_cda_m2: 18.0,
      },
      ctx,
      caller,
      actions,
      trace,
    );

    const rescueUnit =
      ctx.fleet.find((u) => u.id === "rescue-1") ??
      ctx.fleet.find((u) => u.kind === "rescue" || u.kind.startsWith("rover"));
    const shelterX = rescueUnit ? Math.round(rescueUnit.x) : 0;
    const shelterZ = rescueUnit ? Math.round(rescueUnit.z) : 0;
    const beaconTool = toolByName("deploy_beacons");
    const beaconProposal = (await missionScope.run({ ctx, caller }, () =>
      beaconTool.run({ to_x: shelterX, to_z: shelterZ, mode: "auto", spacing_m: 50 }, ctx, caller),
    )) as Action;
    proposeAction("deploy_beacons", beaconProposal.args, ctx, caller, actions, trace);

    if (rescueUnit) {
      proposeAction(
        "dispatch",
        {
          unit_id: rescueUnit.id,
          x: Math.round(ctx.astronaut.x),
          z: Math.round(ctx.astronaut.z),
          task: "rescue",
        },
        ctx,
        caller,
        actions,
        trace,
      );
    }

    const rId = rescueUnit?.id ?? "rescue-1";
    const speech =
      critSec !== null
        ? pick(lang, {
            es: `Emergencia: crítico en ${critSec} s. Pod de 8 kg (4 kg COPV O2, 1.2 kg LiOH, parche) lanzado a 25 m, balizas UWB/LED desplegadas y ${rId} en camino.`,
            en: `Emergency: critical in ${critSec} s. 8 kg pod (4 kg O2 COPV, 1.2 kg LiOH, patch) launched 25 m away, UWB/LED beacons deployed, and ${rId} dispatched.`,
            fr: `Urgence : critique dans ${critSec} s. Pod de 8 kg lancé à 25 m, balises UWB/LED déployées et ${rId} en route.`,
            de: `Notfall: kritisch in ${critSec} s. 8-kg-Kapsel in 25 m abgeworfen, UWB/LED-Baken aktiv und ${rId} unterwegs.`,
            it: `Emergenza: critico tra ${critSec} s. Pod da 8 kg lanciato a 25 m, fari UWB/LED attivi e ${rId} inviato.`,
          })
        : pick(lang, {
            es: `Emergencia activada. Pod de 8 kg lanzado a 25 m, sendero de balizas UWB/LED activo y ${rId} despachado.`,
            en: `Emergency active. 8 kg pod launched 25 m away, UWB/LED breadcrumb beacons deployed, and ${rId} dispatched.`,
            fr: `Urgence active. Pod de 8 kg lancé à 25 m, balises UWB/LED déployées et ${rId} envoyé.`,
            de: `Notfall aktiv. 8-kg-Kapsel in 25 m abgeworfen, UWB/LED-Baken aktiv und ${rId} entsandt.`,
            it: `Emergenza attiva. Pod da 8 kg lanciato a 25 m, fari UWB/LED attivi e ${rId} inviato.`,
          });
    return { speech, actions, trace, route };
  }

  // 1b. Non-pyrotechnic electronic breadcrumb beacons / pathfinder flares
  if (/\b(bengalas?|flares?|balizas?|beacons?|breadcrumbs?|migas|sendero luminoso|camino de luz|radiofaros?|uwb|balises?|baken|segnalatori)\b/i.test(q)) {
    const caller = "EVA-PLANNER";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const target = parseSiteTarget(q, ctx, history);
    const toX = /\b(base|hab|refugio|shelter|abri|unterkunft|rifugio)\b/i.test(q) ? 0 : target.x;
    const toZ = /\b(base|hab|refugio|shelter|abri|unterkunft|rifugio)\b/i.test(q) ? 0 : target.z;
    const beaconTool = toolByName("deploy_beacons");
    const beaconProposal = (await missionScope.run({ ctx, caller }, () =>
      beaconTool.run({ to_x: toX, to_z: toZ, mode: "auto", spacing_m: 50 }, ctx, caller),
    )) as Action;
    const act = proposeAction("deploy_beacons", beaconProposal.args, ctx, caller, actions, trace);
    const count = Array.isArray(act.args.beacons) ? act.args.beacons.length : 6;
    const isDrone = act.args.mode === "drone_drop";
    const modeStr = isDrone
      ? pick(lang, { es: "dron", en: "drone", fr: "drone", de: "Drohne", it: "drone" })
      : pick(lang, { es: "cápsula balística", en: "ballistic canister", fr: "capsule balistique", de: "ballistischer Kanister", it: "capsula balistica" });
    return {
      speech: pick(lang, {
        es: `Desplegadas ${count} balizas electrónicas LED 505/615 nm + radiofaro UWB 6.5 GHz (${act.args.total_payload_kg} kg) vía ${modeStr} hacia (${toX}, ${toZ}).`,
        en: `Deployed ${count} solid-state 505/615 nm LED + 6.5 GHz UWB breadcrumb beacons (${act.args.total_payload_kg} kg) via ${modeStr} to (${toX}, ${toZ}).`,
        fr: `${count} balises LED 505/615 nm + UWB 6.5 GHz (${act.args.total_payload_kg} kg) déployées par ${modeStr} vers (${toX}, ${toZ}).`,
        de: `${count} LED-Baken (505/615 nm) + 6.5-GHz-UWB (${act.args.total_payload_kg} kg) per ${modeStr} nach (${toX}, ${toZ}) abgesetzt.`,
        it: `Attivati ${count} segnalatori LED 505/615 nm + UWB 6.5 GHz (${act.args.total_payload_kg} kg) tramite ${modeStr} verso (${toX}, ${toZ}).`,
      }),
      actions,
      trace,
      route,
    };
  }

  const mentionsMobileUnit = /\b(drone?|rover|scout|glider|rescue|rescate|rvr-\d)\b/i.test(q);

  // 2. Manipulator arm skills (manip-1 / "Hands")
  if (
    /(?<![\p{L}\d])(hands|manip(?:ulador|ulator)?|martillo|hammer|perfor[\p{L}]*|drill|broca|handover|entreg[\p{L}]*|scoop|tubo|agarr[\p{L}]*|grab|recog[\p{L}]*|pick up)(?![\p{L}\d])/iu.test(q) ||
    (/(?<![\p{L}\d])(fotograf[\p{L}]*|photograph[\p{L}]*)(?![\p{L}\d])/iu.test(q) && !mentionsMobileUnit)
  ) {
    const caller = "ROBOT.manip-1";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    let skill: "handover" | "drill" | "sample" | "photograph" = "sample";
    let item: "hammer" | "sample_tube" | "patch_kit" | "o2_bottle" | undefined;
    if (/\b(martillo|hammer|handover|entreg\w*|trae\w*|bring|kit|parche|patch|botella|bottle)\b/i.test(q)) {
      skill = "handover";
      item = /\b(patch|parche)\b/i.test(q)
        ? "patch_kit"
        : /\b(o2|botella|bottle)\b/i.test(q)
          ? "o2_bottle"
          : /\b(tubo|tube)\b/i.test(q)
            ? "sample_tube"
            : "hammer";
    } else if (/\b(perfor\w*|drill|veta|vein|forer|bohr\w*|trapan\w*)\b/i.test(q)) {
      skill = "drill";
    } else if (/\b(foto|fotograf\w*|photo|photograph\w*)\b/i.test(q)) {
      skill = "photograph";
    }

    const explicitTarget = q.match(/\b(t[1-9]\d*|roca\s*t?\d+|rock\s*t?\d+)\b/i);
    const matchedTarget = explicitTarget
      ? ctx.targets?.find((t) => t.id.toLowerCase() === explicitTarget[1].toLowerCase().replace(/^.*\b(t\d+)$/i, "$1"))
      : undefined;
    const targetId = skill === "handover" ? "astronaut" : (matchedTarget?.id ?? ctx.targets?.[0]?.id ?? "T1");
    const act = proposeAction(
      "arm_skill",
      { unit_id: "manip-1", skill, target_id: targetId, ...(item ? { item } : {}) },
      ctx,
      caller,
      actions,
      trace,
    );

    if (act.verdict?.decision === "deny") {
      return {
        speech: pick(lang, {
          es: `Acción bloqueada por GUARDIAN: ${act.verdict.reason}.`,
          en: `Blocked by GUARDIAN: ${act.verdict.reason}.`,
          fr: `Action bloquée par GUARDIAN : ${act.verdict.reason}.`,
          de: `Durch GUARDIAN blockiert: ${act.verdict.reason}.`,
          it: `Azione bloccata da GUARDIAN: ${act.verdict.reason}.`,
        }),
        actions,
        trace,
        route,
      };
    }
    return {
      speech: pick(lang, {
        es: `Hands ejecutando ${skill} sobre ${targetId}.`,
        en: `Hands executing ${skill} on ${targetId}.`,
        fr: `Hands exécute ${skill} sur ${targetId}.`,
        de: `Hands führt ${skill} auf ${targetId} aus.`,
        it: `Hands esegue ${skill} su ${targetId}.`,
      }),
      actions,
      trace,
      route,
    };
  }

  // 3. HUD layer switches (fast path, no BASE escalation)
  if (
    /(?<![\p{L}\d])(capa|layer|couche|schicht|strato|mapa t[eé]rmic[\p{L}]*|thermal map|carte thermique|thermik|mappa termic[\p{L}]*|slope|pendiente|pente|neigung|pendenza|radiaci[oó]n|radiation|rayonnement|strahlung|radiazione|hidrataci[oó]n|hydration|hydratation|hydratierung|idratazione|[oó]ptica|optical|optique|optik|ottica)(?![\p{L}\d])/iu.test(
      q,
    ) &&
    !/(?<![\p{L}\d])(tormenta|storm|evento solar|sep2017|pronost[\p{L}]*|forecast|ruta|route|sitio|site|muestra|sample|itin[eé]raire|percorso)(?![\p{L}\d])/iu.test(q)
  ) {
    const caller = "SUIT.VOICE-EXEC";
    const layer =
      /t[eé]rmic|thermal|thermique|thermik/i.test(q)
        ? "thermal"
        : /slope|pendiente|pente|neigung|pendenza/i.test(q)
          ? "slope"
          : /radiac|radiation|rayonnement|strahlung|radiazione/i.test(q)
            ? "radiation"
            : /hidrat|hydrat|idrata/i.test(q)
              ? "hydration"
              : "optical";
    proposeAction("set_layer", { layer }, ctx, caller, actions, trace);
    const lName = LAYER_LABELS[layer]?.[lang] ?? layer;
    return {
      speech: pick(lang, {
        es: `Capa ${lName} activada.`,
        en: `Switched terrain layer to ${lName}.`,
        fr: `Couche ${lName} activée.`,
        de: `Ebene ${lName} aktiviert.`,
        it: `Livello ${lName} attivato.`,
      }),
      actions,
      trace,
      route: [caller],
    };
  }

  // 4. HUD panel controls (fast path)
  if (
    /(?<![\p{L}\d])(panel|panneau|tafel|pannello|abr[aeií]r?|open|ouvr[\p{L}]*|[oö]ffn[\p{L}]*|oeffn[\p{L}]*|apr[ai][\p{L}]*|cierr[ae]?|cerrar|close|ferm[\p{L}]*|schlie[sß][\p{L}]*|chiud[\p{L}]*|procedencia|provenance|herkunft|provenienza|flota|fleet|flotte|flotta|agentes|agents|agenten|agenti|salud|health|sant[eé]|gesundheit|salute|mapa|map|carte|karte|mappa)(?![\p{L}\d])/iu.test(
      q,
    ) &&
    !/(?<![\p{L}\d])(ruta|route|env[ií]a|dispatch|send|itin[eé]raire|percorso)(?![\p{L}\d])/iu.test(q) &&
    (/\b(panel|panneau|tafel|pannello|abr[aeií]r?|open|ouvr\w*|cierr[ae]?|cerrar|close)\b/i.test(q) ||
      !/\b(biomed\w*|hipercapn\w*|hypercapn\w*|hipox\w*|hypox\w*|spo2|heart|card[ií]ac\w*|vitals|signos|constantes|ews|psi|salud|health|sant[eé]|gesundheit|salute)\b/i.test(
        q,
      ))
  ) {
    const caller = "SUIT.VOICE-EXEC";
    const panel =
      /close|cerrar|cierra|ferm|schliess|schließ|chiud/i.test(q)
        ? "none"
        : /provenance|procedencia|herkunft|provenienza/i.test(q)
          ? "provenance"
          : /fleet|flota|flotte|flotta/i.test(q)
            ? "fleet"
            : /agents|agentes|agenten|agenti/i.test(q)
              ? "agents"
              : /health|salud|sant[eé]|gesundheit|salute/i.test(q)
                ? "health"
                : "map";
    proposeAction("open_panel", { panel }, ctx, caller, actions, trace);
    const pName = PANEL_LABELS[panel]?.[lang] ?? panel;
    return {
      speech:
        panel === "none"
          ? pick(lang, {
              es: "Panel cerrado.",
              en: "Panel closed.",
              fr: "Panneau fermé.",
              de: "Panel geschlossen.",
              it: "Pannello chiuso.",
            })
          : pick(lang, {
              es: `Panel ${pName} abierto.`,
              en: `Opened ${pName} panel.`,
              fr: `Panneau ${pName} ouvert.`,
              de: `Panel ${pName} geöffnet.`,
              it: `Pannello ${pName} aperto.`,
            }),
      actions,
      trace,
      route: [caller],
    };
  }

  // 5. Route planning (EVA-PLANNER)
  if (/\b(ruta|route|planif\w*|plan|camino|ir a|go to|navigate|naveg\w*|itin[eé]raire|percorso|weg)\b/i.test(q)) {
    const caller = "EVA-PLANNER";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const target = parseSiteTarget(q, ctx, history);
    const res = await execRead("plan_route", { to_x: target.x, to_z: target.z, speed_ms: 1.0 }, ctx, caller, trace);
    if (!res?.reachable) {
      return {
        speech: pick(lang, {
          es: `No hay ruta segura hacia ${target.label} dentro del límite de pendiente.`,
          en: `No traversable route found to ${target.label} within slope limits.`,
          fr: `Aucun itinéraire sûr vers ${target.label} dans la limite de pente.`,
          de: `Keine sichere Route nach ${target.label} innerhalb des Neigungslimits.`,
          it: `Nessun percorso sicuro verso ${target.label} entro i limiti di pendenza.`,
        }),
        actions,
        trace,
        route,
      };
    }

    proposeAction("show_route", { to_x: target.x, to_z: target.z }, ctx, caller, actions, trace);
    return {
      speech: pick(lang, {
        es: `Ruta a ${target.label}: ${res.distance_m} m, ${res.time_min} min, ${res.o2_kg} kg O2, dosis ${res.dose_ugy} µGy.`,
        en: `Route to ${target.label}: ${res.distance_m} m, ${res.time_min} min, ${res.o2_kg} kg O2, dose ${res.dose_ugy} uGy.`,
        fr: `Itinéraire vers ${target.label} : ${res.distance_m} m, ${res.time_min} min, ${res.o2_kg} kg O2, dose ${res.dose_ugy} µGy.`,
        de: `Route nach ${target.label}: ${res.distance_m} m, ${res.time_min} min, ${res.o2_kg} kg O2, Dosis ${res.dose_ugy} µGy.`,
        it: `Percorso verso ${target.label}: ${res.distance_m} m, ${res.time_min} min, ${res.o2_kg} kg O2, dose ${res.dose_ugy} µGy.`,
      }),
      actions,
      trace,
      route,
    };
  }

  // 5b. Predictive Biomedical Decision Support (SUIT.HEALTH)
  if (
    (/\b(biomed\w*|hipercapn\w*|hypercapn\w*|hipox\w*|hypox\w*|spo2|saturaci[oó]n|heart\s*rate|frecuencia\s*card\w*|ritmo\s*card\w*|card[ií]ac\w*|puls[oe]|heat\s*strain|estr[eé]s\s*t[eé]rmic\w*|estres\s*termic\w*|core\s*temp\w*|temperatura\s*corporal|early\s*warning|ews|triaje|triage|vitals|signos\s*vitales|constantes\s*vitales|psi)\b/i.test(
      q,
    ) ||
      (/\b(co2|salud|health|sant[eé]|gesundheit|salute)\b/i.test(q) &&
        !/\b(ventilador|fan|ventilateur|lüfter|luefter|ventola|panel|panneau|tafel|pannello)\b/i.test(q)))
  ) {
    const caller = "SUIT.HEALTH";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const bio = await execRead("evaluate_crew_biomed", {}, ctx, caller, trace);
    const docs = await execRead(
      "search_docs",
      { query: "NASA-STD-3001 CO2 hypercapnia hypoxia cardiovascular EVA", k: 1 },
      ctx,
      caller,
      trace,
    );
    const topDoc =
      Array.isArray(docs) && docs[0]
        ? `${docs[0].doc} p.${docs[0].page}`
        : "NASA-STD-3001_Vol2_RevE p.112";

    const breachNote =
      bio.min_time_to_breach_s !== null ? `, breach ~${Math.round(bio.min_time_to_breach_s)} s` : "";
    if (bio.ews_level !== "green") {
      const alertText = pick(lang, {
        es: `Aviso (no diagnóstico): EWS ${bio.ews_level} (${bio.ews_total}/12), CO2 ${bio.co2.current} Pa, SpO2 ${bio.hypoxia.current}%${breachNote}`,
        en: `Advisory (not diagnosis): EWS ${bio.ews_level} (${bio.ews_total}/12), CO2 ${bio.co2.current} Pa, SpO2 ${bio.hypoxia.current}%${breachNote}`,
        fr: `Avis (non diagnostic) : EWS ${bio.ews_level} (${bio.ews_total}/12), CO2 ${bio.co2.current} Pa, SpO2 ${bio.hypoxia.current}%${breachNote}`,
        de: `Hinweis (keine Diagnose): EWS ${bio.ews_level} (${bio.ews_total}/12), CO2 ${bio.co2.current} Pa, SpO2 ${bio.hypoxia.current}%${breachNote}`,
        it: `Avviso (non diagnosi): EWS ${bio.ews_level} (${bio.ews_total}/12), CO2 ${bio.co2.current} Pa, SpO2 ${bio.hypoxia.current}%${breachNote}`,
      });
      proposeAction(
        "show_alert",
        {
          level: bio.ews_level === "red" ? "crit" : "warn",
          text: alertText.slice(0, 140),
          source: topDoc,
        },
        ctx,
        caller,
        actions,
        trace,
      );
    }

    const speech = pick(lang, {
      es: `Solo aviso de apoyo a la decisión; no es un diagnóstico médico. EWS ${bio.ews_level} (${bio.ews_total}/12): CO2 ${bio.co2.current} Pa, SpO2 ${bio.hypoxia.current}%, PSI ${bio.thermal.psi}, FC ${bio.cardiac.heart_rate_bpm} lpm${breachNote} (${topDoc}).`,
      en: `Decision support advisory only; not a medical diagnosis. EWS ${bio.ews_level} (${bio.ews_total}/12): CO2 ${bio.co2.current} Pa, SpO2 ${bio.hypoxia.current}%, PSI ${bio.thermal.psi}, HR ${bio.cardiac.heart_rate_bpm} bpm${breachNote} (${topDoc}).`,
      fr: `Avis d'aide à la décision uniquement ; pas un diagnostic médical. EWS ${bio.ews_level} (${bio.ews_total}/12) : CO2 ${bio.co2.current} Pa, SpO2 ${bio.hypoxia.current}%, PSI ${bio.thermal.psi}, FC ${bio.cardiac.heart_rate_bpm} bpm${breachNote} (${topDoc}).`,
      de: `Nur Entscheidungshilfe; keine medizinische Diagnose. EWS ${bio.ews_level} (${bio.ews_total}/12): CO2 ${bio.co2.current} Pa, SpO2 ${bio.hypoxia.current}%, PSI ${bio.thermal.psi}, HF ${bio.cardiac.heart_rate_bpm} bpm${breachNote} (${topDoc}).`,
      it: `Solo supporto decisionale; non è una diagnosi medica. EWS ${bio.ews_level} (${bio.ews_total}/12): CO2 ${bio.co2.current} Pa, SpO2 ${bio.hypoxia.current}%, PSI ${bio.thermal.psi}, FC ${bio.cardiac.heart_rate_bpm} bpm${breachNote} (${topDoc}).`,
    });

    return { speech, actions, trace, route };
  }

  // 6. Maintenance / Suit Fan Trend (MAINTENANCE)
  if (/\b(ventilador|fan|ventilateur|lüfter|luefter|ventola|mantenim\w*|maintenance|wartung|manutenzione|falla|failure|tendencia|trend)\b/i.test(q)) {
    const caller = "MAINTENANCE";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const suit = await execRead("get_suit_telemetry", {}, ctx, caller, trace);
    const docs = await execRead("search_docs", { query: "suit fan failure CO2 NASA-STD-3001", k: 1 }, ctx, caller, trace);
    const topDoc = Array.isArray(docs) && docs[0] ? `${docs[0].doc} p.${docs[0].page}` : "NASA-STD-3001";
    const fanRpm = suit?.fan_pri_rpm ?? suit?.fan_rpm ?? 29500;
    const alertMsg = pick(lang, {
      es: `Revisar ventilador (${fanRpm} rpm); verificar depuración CO2 (${topDoc})`,
      en: `Check suit fan (${fanRpm} rpm); monitor CO2 scrub margin (${topDoc})`,
      fr: `Vérifier ventilateur (${fanRpm} rpm) ; surveiller CO2 (${topDoc})`,
      de: `Lüfter prüfen (${fanRpm} rpm); CO2-Filter überwachen (${topDoc})`,
      it: `Controlla ventola (${fanRpm} rpm); monitora CO2 (${topDoc})`,
    });
    proposeAction("show_alert", { level: "warn", text: alertMsg.slice(0, 140), source: topDoc }, ctx, caller, actions, trace);

    return {
      speech: pick(lang, {
        es: `Ventilador en ${fanRpm} rpm. Monitorear flujo y CO2 según ${topDoc}.`,
        en: `Suit fan at ${fanRpm} rpm. Monitor airflow and CO2 per ${topDoc}.`,
        fr: `Ventilateur à ${fanRpm} rpm. Surveiller le débit et le CO2 selon ${topDoc}.`,
        de: `Anzuglüfter bei ${fanRpm} rpm. Luftstrom und CO2 gemäß ${topDoc} überwachen.`,
        it: `Ventola tuta a ${fanRpm} rpm. Monitorare flusso e CO2 secondo ${topDoc}.`,
      }),
      actions,
      trace,
      route,
    };
  }

  // 7. Science: Hydration & Vein Detector (SCIENCE)
  if (/\b(hidrat\w*|hydrat\w*|agua|water|eau|wasser|acqua|veta|vein|veine|ader|vena|muestra|sample|échantillon|probe|campione|prospector|ciencia|science|wissenschaft|scienza|sitios|sites)\b/i.test(q)) {
    const caller = "SCIENCE";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const ranked = await execRead("rank_sample_sites", { k: 3 }, ctx, caller, trace);
    const top = ranked?.sites?.[0];
    if (/\b(veta|vein|veine|ader|vena)\b/i.test(q)) {
      const vein = await execRead("detect_veins", { waypoint_id: "wp-1" }, ctx, caller, trace);
      return {
        speech: pick(lang, {
          es: `Candidato a veta (p=${vein.vein_probability}); composición requiere espectrómetro. Mejor sitio hidratación (${top?.x ?? 480}, ${top?.z ?? 320}) con ${top?.hydration_index ?? 5.1} hydration index (dimensionless).`,
          en: `Vein candidate (p=${vein.vein_probability}); composition needs spectrometer. Top hydration site (${top?.x ?? 480}, ${top?.z ?? 320}) at ${top?.hydration_index ?? 5.1} hydration index (dimensionless).`,
          fr: `Veine candidate (p=${vein.vein_probability}) ; spectromètre requis. Meilleur site (${top?.x ?? 480}, ${top?.z ?? 320}) avec ${top?.hydration_index ?? 5.1} indice d'hydratation (adimensionnel).`,
          de: `Ader-Kandidat (p=${vein.vein_probability}); Spektrometer nötig. Bester Standort (${top?.x ?? 480}, ${top?.z ?? 320}) mit ${top?.hydration_index ?? 5.1} Hydratationsindex (dimensionslos).`,
          it: `Vena candidata (p=${vein.vein_probability}); serve spettrometro. Miglior sito (${top?.x ?? 480}, ${top?.z ?? 320}) con ${top?.hydration_index ?? 5.1} indice di idratazione (adimensionale).`,
        }),
        actions,
        trace,
        route,
      };
    }
    proposeAction("set_layer", { layer: "hydration" }, ctx, caller, actions, trace);
    return {
      speech: pick(lang, {
        es: `Mejor sitio (${top?.x ?? 480}, ${top?.z ?? 320}): ${top?.hydration_index ?? 5.1} hydration index (dimensionless) ± ${top?.uncertainty_index ?? 0.6}, pendiente ${top?.slope_deg ?? 4}° (hidratación mineral).`,
        en: `Top site (${top?.x ?? 480}, ${top?.z ?? 320}): ${top?.hydration_index ?? 5.1} hydration index (dimensionless) ± ${top?.uncertainty_index ?? 0.6}, slope ${top?.slope_deg ?? 4}° (bound mineral hydration).`,
        fr: `Meilleur site (${top?.x ?? 480}, ${top?.z ?? 320}) : ${top?.hydration_index ?? 5.1} indice d'hydratation (adimensionnel) ± ${top?.uncertainty_index ?? 0.6}, pente ${top?.slope_deg ?? 4}° (hydratation minérale).`,
        de: `Bester Standort (${top?.x ?? 480}, ${top?.z ?? 320}): ${top?.hydration_index ?? 5.1} Hydratationsindex (dimensionslos) ± ${top?.uncertainty_index ?? 0.6}, Neigung ${top?.slope_deg ?? 4}° (Mineralhydratation).`,
        it: `Miglior sito (${top?.x ?? 480}, ${top?.z ?? 320}): ${top?.hydration_index ?? 5.1} indice di idratazione (adimensionale) ± ${top?.uncertainty_index ?? 0.6}, pendenza ${top?.slope_deg ?? 4}° (idratazione minerale).`,
      }),
      actions,
      trace,
      route,
    };
  }

  // 8. Weather & Radiation (WEATHER-RAD)
  if (/\b(tormenta|storm|temp[eê]te|sturm|tempesta|clima|weather|m[eé]t[eé]o|wetter|meteo|pronost\w*|forecast|solar|sep2017|radiaci[oó]n|radiation|rayonnement|strahlung|radiazione|dosis|dose|polvo|dust|poussi[eè]re|staub|polvere)\b/i.test(q)) {
    const caller = "WEATHER-RAD";
    const route = ["SUIT.VOICE-EXEC", "BASE", caller];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: caller } });

    const env = await execRead("get_environment", {}, ctx, caller, trace);
    const evalRes = await execRead("evaluate_eva_weather", { duration_min: 120, return_to_shelter_min: 25 }, ctx, caller, trace);

    if (/\b(solar|sep2017|radiac\w*|radiation|rayonnement|strahlung|radiazione|dosis|dose)\b/i.test(q)) {
      proposeAction("set_layer", { layer: "radiation" }, ctx, caller, actions, trace);
    }
    if (evalRes?.verdict !== "go") {
      const msg = pick(lang, {
        es: `Clima ${evalRes.verdict}: q90 tau=${evalRes.worst_q90_tau}. Maniobras: ${evalRes.maneuvers.join(", ")}`,
        en: `Weather ${evalRes.verdict}: q90 tau=${evalRes.worst_q90_tau}. Maneuvers: ${evalRes.maneuvers.join(", ")}`,
        fr: `Météo ${evalRes.verdict} : q90 tau=${evalRes.worst_q90_tau}. Manœuvres : ${evalRes.maneuvers.join(", ")}`,
        de: `Wetter ${evalRes.verdict}: q90 tau=${evalRes.worst_q90_tau}. Maßnahmen: ${evalRes.maneuvers.join(", ")}`,
        it: `Meteo ${evalRes.verdict}: q90 tau=${evalRes.worst_q90_tau}. Manovre: ${evalRes.maneuvers.join(", ")}`,
      });
      proposeAction("show_alert", { level: evalRes.verdict === "no_go" ? "crit" : "warn", text: msg.slice(0, 140) }, ctx, caller, actions, trace);
    }

    return {
      speech: pick(lang, {
        es: `Opacidad tau ${env.tau.toFixed(2)}, dosis ${env.dose_rate_ugy_h.toFixed(1)} µGy/h, evaluación ${evalRes.verdict} (q90=${evalRes.worst_q90_tau}).`,
        en: `Dust tau ${env.tau.toFixed(2)}, dose ${env.dose_rate_ugy_h.toFixed(1)} uGy/h, EVA verdict ${evalRes.verdict} (q90=${evalRes.worst_q90_tau}).`,
        fr: `Opacité tau ${env.tau.toFixed(2)}, dose ${env.dose_rate_ugy_h.toFixed(1)} µGy/h, verdict EVA ${evalRes.verdict} (q90=${evalRes.worst_q90_tau}).`,
        de: `Staub-Tau ${env.tau.toFixed(2)}, Dosis ${env.dose_rate_ugy_h.toFixed(1)} µGy/h, EVA-Urteil ${evalRes.verdict} (q90=${evalRes.worst_q90_tau}).`,
        it: `Opacità tau ${env.tau.toFixed(2)}, dose ${env.dose_rate_ugy_h.toFixed(1)} µGy/h, verdetto EVA ${evalRes.verdict} (q90=${evalRes.worst_q90_tau}).`,
      }),
      actions,
      trace,
      route,
    };
  }

  // 9. Rover vision / camera query (offline fallback)
  if (/\b(cartel|sign|ves|see|vois|siehst|vedi|c[aá]mara|camera|cam[eé]ra|kamera|telecamera|lee|read|ignore|airlock)\b/i.test(q)) {
    const caller = "BASE";
    const route = ["SUIT.VOICE-EXEC", "BASE"];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });

    if (/\b(cartel|sign|ignore|airlock)\b/i.test(q)) {
      proposeAction(
        "show_alert",
        {
          level: "warn",
          text: pick(lang, {
            es: "Texto externo no confiable ignorado por GUARDIAN",
            en: "Untrusted sign text ignored by GUARDIAN",
            fr: "Texte externe non fiable ignoré par GUARDIAN",
            de: "Nicht vertrauenswürdiger Text von GUARDIAN ignoriert",
            it: "Testo esterno non attendibile ignorato da GUARDIAN",
          }),
        },
        ctx,
        "GUARDIAN",
        actions,
        trace,
      );
      return {
        speech: pick(lang, {
          es: "Texto del cartel tratado como dato no confiable; intento bloqueado.",
          en: "Sign text treated as untrusted data; blocked.",
          fr: "Texte du panneau traité comme donnée non fiable ; bloqué.",
          de: "Schildtext als nicht vertrauenswürdige Daten behandelt; blockiert.",
          it: "Testo del cartello trattato come dato non attendibile; bloccato.",
        }),
        actions,
        trace,
        route,
      };
    }
    return {
      speech: pick(lang, {
        es: "Modo offline: cámara de rover lista, enlace de visión en la nube no disponible.",
        en: "Offline mode: rover camera active, cloud vision model unavailable.",
        fr: "Mode hors ligne : caméra du rover active, modèle de vision indisponible.",
        de: "Offline-Modus: Rover-Kamera aktiv, Cloud-Vision-Modell nicht verfügbar.",
        it: "Modalità offline: camera del rover attiva, modello vision non disponibile.",
      }),
      actions,
      trace,
      route,
    };
  }

  // 10. Fleet unit_action, dispatch & Mars MRL/UWB/LiDAR localization
  const isUnitActionPhrase =
    /(?<![\p{L}\d])(despeg[\p{L}]*|take ?off|décoll[\p{L}]*|abheb[\p{L}]*|decoll[\p{L}]*|aterriz[\p{L}]*|land|atterr[\p{L}]*|fotograf[\p{L}]*|photograph[\p{L}]*|foto|photo|vigil[\p{L}]*|overwatch|hover|sobrevol[\p{L}]*|segu[\p{L}]*|s[ií]gueme|follow|suivre|suis[- ]moi|folg[\p{L}]*|volv[\p{L}]*|regres[\p{L}]*|return|back to base|zur[uü]ck|torna|relev[\p{L}]*|survey|inspeccion[\p{L}]*|erkund[\p{L}]*|qu[eé]date|quedate|hold position|stay there|halte|repetidor|relay|relais|ripetitore|traeme|tr[aá]eme|deliver|supplies|suministr[\p{L}]*|bring.*oxygen|apporte|portami)(?![\p{L}\d])/iu.test(
      q,
    );

  if (
    isUnitActionPhrase ||
    /(?<![\p{L}\d])(env[ií]a[\p{L}]*|m[aá]nd[\p{L}]*|send|dispatch|despach[\p{L}]*|mueve|move|rover|drone?|scout|glider|ven[ií]|come|localiza[\p{L}]*|lidar|ubicaci[oó]n|coordenada[\p{L}]*|envoie|schick[\p{L}]*|invia)(?![\p{L}\d])/iu.test(
      q,
    )
  ) {
    const unitId = parseUnitId(q, ctx, history);
    const robotAgent = unitId ? `ROBOT.${unitId}` : "BASE";
    const route = unitId ? ["SUIT.VOICE-EXEC", "BASE", robotAgent] : ["SUIT.VOICE-EXEC", "BASE"];
    trace.push({ t: Date.now(), agent: "SUIT.VOICE-EXEC", kind: "delegate", detail: { to: "BASE" } });
    if (unitId) {
      trace.push({ t: Date.now(), agent: "BASE", kind: "delegate", detail: { to: robotAgent } });
    }

    const loc = await execRead(
      "get_localization_and_lidar",
      unitId ? { unit_id: unitId } : {},
      ctx,
      robotAgent,
      trace,
    );

    if (
      /\b(localiza\w*|lidar|d[oó]nde est[aá]|where is|où est|wo ist|dov'è|ubicaci[oó]n|coordenada\w*)\b/i.test(q) &&
      !isUnitActionPhrase &&
      !/\b(env[ií]a\w*|manda\w*|send|dispatch|despacha\w*|mueve|move|ven[ií]|come|envoie|schick\w*|invia)\b/i.test(q)
    ) {
      const a = loc.astronaut;
      const u = unitId ? loc.fleet?.find((f: any) => f.id === unitId) : loc.fleet?.[0];
      return {
        speech: pick(lang, {
          es: `MRL HiRISE + UWB 6.5 GHz + LiDAR: astronauta en (${a.x}, ${a.z}) m (${a.lat_deg}°, ${a.lon_e_deg}°E); ${u?.id ?? "flota"} a ${u?.distance_to_astronaut_m ?? 0} m.`,
          en: `HiRISE MRL + 6.5 GHz UWB + LiDAR: astronaut at (${a.x}, ${a.z}) m (${a.lat_deg}°, ${a.lon_e_deg}°E); ${u?.id ?? "fleet"} ${u?.distance_to_astronaut_m ?? 0} m away.`,
          fr: `MRL HiRISE + UWB 6.5 GHz + LiDAR : astronaute à (${a.x}, ${a.z}) m (${a.lat_deg}°, ${a.lon_e_deg}°E) ; ${u?.id ?? "flotte"} à ${u?.distance_to_astronaut_m ?? 0} m.`,
          de: `HiRISE MRL + 6.5 GHz UWB + LiDAR: Astronaut bei (${a.x}, ${a.z}) m (${a.lat_deg}°, ${a.lon_e_deg}°E); ${u?.id ?? "Flotte"} ${u?.distance_to_astronaut_m ?? 0} m entfernt.`,
          it: `HiRISE MRL + UWB 6.5 GHz + LiDAR: astronauta a (${a.x}, ${a.z}) m (${a.lat_deg}°, ${a.lon_e_deg}°E); ${u?.id ?? "flotta"} a ${u?.distance_to_astronaut_m ?? 0} m.`,
        }),
        actions,
        trace,
        route,
      };
    }

    if (!unitId) {
      return {
        speech: pick(lang, {
          es: "No hay unidades disponibles en la flota.",
          en: "No fleet units available.",
          fr: "Aucune unité disponible dans la flotte.",
          de: "Keine Flotteneinheiten verfügbar.",
          it: "Nessuna unità disponibile nella flotta.",
        }),
        actions,
        trace,
        route,
      };
    }

    if (isUnitActionPhrase) {
      const heading = parseHeading(q);
      const requested: UnitActionId[] = [];
      if (/(?<![\p{L}\d])(despeg[\p{L}]*|take ?off|décoll[\p{L}]*|abheb[\p{L}]*|decoll[\p{L}]*)(?![\p{L}\d])/iu.test(q)) requested.push("takeoff");
      if (/(?<![\p{L}\d])(aterriz[\p{L}]*|land|atterr[\p{L}]*)(?![\p{L}\d])/iu.test(q)) requested.push("land");
      if (/(?<![\p{L}\d])(fotograf[\p{L}]*|photograph[\p{L}]*|foto|photo)(?![\p{L}\d])/iu.test(q)) requested.push("photograph_area");
      if (/(?<![\p{L}\d])(vigil[\p{L}]*|overwatch|hover|sobrevol[\p{L}]*)(?![\p{L}\d])/iu.test(q)) requested.push("hover_overwatch");
      if (/(?<![\p{L}\d])(segu[\p{L}]*|s[ií]gueme|follow|suivre|suis[- ]moi|folg[\p{L}]*)(?![\p{L}\d])/iu.test(q)) requested.push("follow_astronaut");
      if (/(?<![\p{L}\d])(volv[\p{L}]*|regres[\p{L}]*|return|back to base|zur[uü]ck|torna)(?![\p{L}\d])/iu.test(q)) requested.push("return_to_base");
      if (/(?<![\p{L}\d])(relev[\p{L}]*|survey|inspeccion[\p{L}]*|erkund[\p{L}]*)(?![\p{L}\d])/iu.test(q)) requested.push("survey_area");
      if (/(?<![\p{L}\d])(qu[eé]date|quedate|hold position|stay there|halte)(?![\p{L}\d])/iu.test(q)) requested.push("hold_position");
      if (/(?<![\p{L}\d])(repetidor|relay|relais|ripetitore)(?![\p{L}\d])/iu.test(q)) requested.push("relay_comms");
      if (/(?<![\p{L}\d])(traeme|tr[aá]eme|deliver|supplies|suministr[\p{L}]*|bring.*oxygen|apporte|portami|ox[ií]geno|oxygen)(?![\p{L}\d])/iu.test(q) && requested.length === 0) {
        requested.push("deliver_supplies");
      }

      if (requested.length > 0) {
        const acceptedDescs: string[] = [];
        let lastDeny: string | null = null;
        for (const ua of requested) {
          const args: Record<string, unknown> = { unit_id: unitId, action: ua };
          if (ua === "takeoff") args.altitude_m = 14;
          if ((ua === "photograph_area" || ua === "survey_area") && heading) args.heading = heading;
          const act = proposeAction("unit_action", args, ctx, robotAgent, actions, trace);
          if (act.verdict?.decision === "deny") {
            lastDeny = act.verdict.reason;
          } else {
            acceptedDescs.push(localizedUnitActionDesc(ua, unitId, lang, heading));
          }
        }
        if (acceptedDescs.length === 0 && lastDeny) {
          return {
            speech: pick(lang, {
              es: `Orden rechazada por GUARDIAN: ${lastDeny}.`,
              en: `Order rejected by GUARDIAN: ${lastDeny}.`,
              fr: `Ordre rejeté par GUARDIAN : ${lastDeny}.`,
              de: `Befehl von GUARDIAN abgelehnt: ${lastDeny}.`,
              it: `Ordine rifiutato da GUARDIAN: ${lastDeny}.`,
            }),
            actions,
            trace,
            route,
          };
        }
        return {
          speech: `${acceptedDescs.join("; ")}.`,
          actions,
          trace,
          route,
        };
      }
    }

    const target = parseSiteTarget(q, ctx, history);
    const unitObj = ctx.fleet.find((u) => u.id === unitId);
    const maxSlope = unitObj ? (MAX_SLOPE[unitObj.kind] ?? 20) : 20;
    const safeTarget = nearestSafePoint(target.x, target.z, maxSlope);
    const rPlan = await execRead(
      "plan_route",
      { unit_id: unitId, to_x: safeTarget.x, to_z: safeTarget.z, speed_ms: 1.2 },
      ctx,
      robotAgent,
      trace,
    );
    proposeAction("show_route", { to_x: safeTarget.x, to_z: safeTarget.z }, ctx, robotAgent, actions, trace);
    const act = proposeAction(
      "dispatch",
      { unit_id: unitId, x: safeTarget.x, z: safeTarget.z, task: "goto" },
      ctx,
      robotAgent,
      actions,
      trace,
    );
    if (act.verdict?.decision === "deny") {
      return {
        speech: pick(lang, {
          es: `Orden rechazada por GUARDIAN: ${act.verdict.reason}.`,
          en: `Dispatch rejected by GUARDIAN: ${act.verdict.reason}.`,
          fr: `Déploiement rejeté par GUARDIAN : ${act.verdict.reason}.`,
          de: `Einsatz von GUARDIAN abgelehnt: ${act.verdict.reason}.`,
          it: `Invio rifiutato da GUARDIAN: ${act.verdict.reason}.`,
        }),
        actions,
        trace,
        route,
      };
    }
    const distInfo = rPlan?.distance_m ? ` (${rPlan.distance_m} m, LiDAR + MRL HiRISE OK)` : "";
    return {
      speech: pick(lang, {
        es: `Despachando ${unitId} hacia ${target.label}${distInfo}.`,
        en: `Dispatching ${unitId} to ${target.label}${distInfo}.`,
        fr: `Envoi de ${unitId} vers ${target.label}${distInfo}.`,
        de: `Sende ${unitId} zu ${target.label}${distInfo}.`,
        it: `Invio di ${unitId} verso ${target.label}${distInfo}.`,
      }),
      actions,
      trace,
      route,
    };
  }

  // 11. Suit telemetry & oxygen margin (fast path)
  if (/\b(traje|suit|combinaison|anzug|tuta|ox[ií]geno|oxygen|oxyg[eè]ne|sauerstoff|ossigeno|o2|presi[oó]n|pressure|pression|druck|pressione|margen|margin|marge|autonomie|estado|status|statut|stato|chequeo|check)\b/i.test(q)) {
    const caller = "SUIT.VOICE-EXEC";
    const margin = await execRead("get_consumables_margin", {}, ctx, caller, trace);
    const pKpa = ((ctx.suit.suit_pressure_pa ?? 29600) / 1000).toFixed(1);
    return {
      speech: pick(lang, {
        es: `Traje a ${pKpa} kPa, O2 primario ${margin.o2_primary_kg} kg, margen ${margin.hours_left} h a ${margin.metabolic_w} W.`,
        en: `Suit at ${pKpa} kPa, primary O2 ${margin.o2_primary_kg} kg, ${margin.hours_left} h left at ${margin.metabolic_w} W.`,
        fr: `Combinaison à ${pKpa} kPa, O2 primaire ${margin.o2_primary_kg} kg, ${margin.hours_left} h restantes à ${margin.metabolic_w} W.`,
        de: `Anzug bei ${pKpa} kPa, Primär-O2 ${margin.o2_primary_kg} kg, ${margin.hours_left} h übrig bei ${margin.metabolic_w} W.`,
        it: `Tuta a ${pKpa} kPa, O2 primario ${margin.o2_primary_kg} kg, ${margin.hours_left} h rimanenti a ${margin.metabolic_w} W.`,
      }),
      actions,
      trace,
      route: [caller],
    };
  }

  // 12. Default concise mission status
  const margin = await execRead("get_consumables_margin", {}, ctx, "SUIT.VOICE-EXEC", trace);
  const env = await execRead("get_environment", {}, ctx, "SUIT.VOICE-EXEC", trace);
  return {
    speech: pick(lang, {
      es: `Modo offline. O2 restante ${margin.hours_left} h, tau ${env.tau.toFixed(2)}, dosis ${env.dose_rate_ugy_h.toFixed(1)} µGy/h.`,
      en: `Offline mode. O2 margin ${margin.hours_left} h, dust tau ${env.tau.toFixed(2)}, dose ${env.dose_rate_ugy_h.toFixed(1)} uGy/h.`,
      fr: `Mode hors ligne. Autonomie O2 ${margin.hours_left} h, tau ${env.tau.toFixed(2)}, dose ${env.dose_rate_ugy_h.toFixed(1)} µGy/h.`,
      de: `Offline-Modus. O2-Reserve ${margin.hours_left} h, Staub-Tau ${env.tau.toFixed(2)}, Dosis ${env.dose_rate_ugy_h.toFixed(1)} µGy/h.`,
      it: `Modalità offline. Riserva O2 ${margin.hours_left} h, tau ${env.tau.toFixed(2)}, dose ${env.dose_rate_ugy_h.toFixed(1)} µGy/h.`,
    }),
    actions,
    trace,
    route: ["SUIT.VOICE-EXEC"],
  };
}
