/**
 * Matches explicit questions/commands asking what the astronaut helmet visor or a fleet camera sees,
 * without matching unrelated fleet navigation orders ("Rover two, go to site 3"), map/layer commands,
 * or descriptive statements ("the camera is dusty").
 */
export const VISION_QUESTION_RE =
  /what (?:do|does) (?:you|i|the rover|rover \w+|the drone|drone \w+|rescue(?:[- ]?1)?) see|what am i seeing|can you see what i(?:'m| am)? seeing|what is in front of me|(?<![\p{L}])qu[eé] (?:ves?|veo|estoy viendo|hay frente a m[ií]|ve (?:el |la )?(?:rover|drone|dron|rescue|rescate|manipulador)(?:\s+\w+)?)(?![\p{L}])|(?<![\p{L}])(?:pod[eé]s|puedes) ver lo que (?:estoy viendo|veo)(?![\p{L}])|(?<![\p{L}])lo que estoy viendo(?![\p{L}])|read (?:the |that )?sign|(?<![\p{L}])le[eé]r? (?:el )?cartel|(?:camera|c[aá]mara|visor|helmet) view|vista de (?:la )?(?:c[aá]mara|visor|casco)|(?:c[aá]mara|camera) (?:del|de la|of(?: the)?) (?:casco|visor|astronaut\w*|rover(?:\s+\w+)?|drone(?:\s+\w+)?|dron(?:\s+\w+)?|rescue|rescate)|(?:show|ver|mostr[\p{L}]*|mu[eé]str[\p{L}]*|analiz[\p{L}]*|inspect) (?:me )?(?:the |la |el |mi )?(?:(?:rover|drone|dron|helmet|visor|astronaut)(?:\s+\w+)? )?(?:camera|c[aá]mara|vista)/iu;

const FIRST_PERSON_VISION_RE =
  /what am i seeing|what do i see|can you see what i|in front of me|(?<![\p{L}])(?:lo que (?:estoy viendo|veo)|qu[eé] (?:estoy viendo|veo|hay frente a m[ií])|frente a m[ií]|mi (?:vista|casco|visor)|(?:c[aá]mara|vista) (?:de mi |del )?(?:casco|visor)|(?:helmet|visor) (?:camera|view))(?![\p{L}])/iu;

function matchVisionUnitId(text: string): string | null {
  const q = text.toLowerCase();
  if (/\b(?:drone|dron)[-\s]*(?:2|two|dos|deux|zwei|due)\b/i.test(q)) return "drone-2";
  if (/\b(?:drone|dron)(?:[-\s]*(?:1|one|uno|un|eins))?\b/i.test(q)) return "drone-1";
  if (/\b(?:rescue|rescate)(?:[-\s]*(?:1|one|uno))?\b/i.test(q)) return "rescue-1";
  if (/\b(?:rover|rvr)[-\s]*(?:3|three|tres|trois|drei|tre)\b|\b(?:manip(?:ulador|ulator)?|hands)\b/i.test(q)) {
    return "rover-3";
  }
  if (/\b(?:rover|rvr)[-\s]*(?:1|one|uno|un|eins)\b/i.test(q)) return "rover-1";
  if (/\b(?:rover|rvr)[-\s]*(?:2|two|dos|deux|zwei|due)\b/i.test(q)) return "rover-2";
  if (FIRST_PERSON_VISION_RE.test(q)) return "astronaut";
  if (/\b(?:rover|rvr|cartel|sign)\b/i.test(q)) return "rover-2";
  return "astronaut";
}

export interface VisionIntentMatch {
  isVision: boolean;
  unitId: string | null;
}

export function parseVisionIntent(text: string): VisionIntentMatch {
  if (!VISION_QUESTION_RE.test(text)) {
    return { isVision: false, unitId: null };
  }
  return {
    isVision: true,
    unitId: matchVisionUnitId(text),
  };
}

export function isVisionQuestion(text: string): boolean {
  return VISION_QUESTION_RE.test(text);
}
