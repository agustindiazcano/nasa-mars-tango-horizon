/**
 * Matches explicit questions/commands asking what a rover camera sees, without matching
 * unrelated fleet navigation orders ("Rover two, go to site 3") or map/layer commands.
 */
export const VISION_QUESTION_RE =
  /what (?:do|does) (?:you|the rover|rover \w+) see|(?<![\p{L}])qu[eé] ves?(?![\p{L}])|read (?:the |that )?sign|(?<![\p{L}])le[eé]r? (?:el )?cartel|(?:camera|c[aá]mara) view|vista de (?:la )?c[aá]mara|(?:show|ver|mostr[\p{L}]*|mu[eé]str[\p{L}]*) (?:me )?(?:the |la |el )?(?:rover \w+ )?(?:camera|c[aá]mara)/iu;

export function isVisionQuestion(text: string): boolean {
  return VISION_QUESTION_RE.test(text);
}
