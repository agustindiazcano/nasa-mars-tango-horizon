import { en, type Key } from "./en.js";
import { es } from "./es.js";
import { fr } from "./fr.js";
import { de } from "./de.js";
import { it } from "./it.js";

export const LANGS = ["en", "es", "fr", "de", "it"] as const;
export type Lang = (typeof LANGS)[number];

/** Locale used for speech recognition (Web Speech API). */
export const ASR_LOCALE: Record<Lang, string> = {
  en: "en-US",
  es: "es-AR",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
};

/** Locale used for neural speech synthesis. Must match the list accepted by /api/tts. */
export const TTS_LOCALE: Record<Lang, string> = {
  en: "en-US",
  es: "es-US",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
};

export const LANG_NAME: Record<Lang, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
};

export type Dict = Record<string, string>;

const dicts: Partial<Record<Lang, Dict>> = {};
let active: Lang = "en";
const listeners = new Set<(l: Lang) => void>();

export function registerDict(lang: Lang, dict: Dict): void {
  dicts[lang] = dict;
}

export const getLang = (): Lang => active;

export const availableLangs = (): Lang[] => LANGS.filter((l) => Boolean(dicts[l]));

export function setLang(lang: Lang): void {
  if (!dicts[lang]) return;
  active = lang;
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Translate a key. Falls back to English, then to the key itself, so a missing string is visible but never breaks the UI. */
export function t(key: Key | (string & {}), params: Record<string, string | number> = {}): string {
  const s = dicts[active]?.[key] ?? dicts.en?.[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_m, k) => String(params[k] ?? `{${k}}`));
}

/** Numbers follow the active locale; units stay SI and are never translated. */
export const fmt = (n: number, digits = 1): string =>
  n.toLocaleString(ASR_LOCALE[active], {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

// Auto-register all built-in language dictionaries on module load.
registerDict("en", en);
registerDict("es", es);
registerDict("fr", fr);
registerDict("de", de);
registerDict("it", it);

export { en, es, fr, de, it };
export type { Key };
