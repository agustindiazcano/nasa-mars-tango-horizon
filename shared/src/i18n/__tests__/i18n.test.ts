import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ASR_LOCALE,
  availableLangs,
  de,
  en,
  es,
  fmt,
  fr,
  getLang,
  it as itDict,
  LANG_NAME,
  LANGS,
  onLangChange,
  setLang,
  t,
  TTS_LOCALE,
} from "../index.js";

const DICTS = { en, es, fr, de, it: itDict } as const;

function extractPlaceholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("i18n dictionaries and runtime", () => {
  afterEach(() => {
    setLang("en");
  });

  it("auto-registers all 5 languages on module load", () => {
    expect(availableLangs()).toEqual([...LANGS]);
    expect(getLang()).toBe("en");
    for (const lang of LANGS) {
      expect(ASR_LOCALE[lang]).toBeTruthy();
      expect(TTS_LOCALE[lang]).toBeTruthy();
      expect(LANG_NAME[lang]).toBeTruthy();
    }
  });

  it("maintains 100% key parity across en, es, fr, de, and it", () => {
    const enKeys = Object.keys(en).sort();
    expect(enKeys.length).toBeGreaterThan(0);

    for (const lang of ["es", "fr", "de", "it"] as const) {
      const dict = DICTS[lang] as Record<string, string>;
      expect(Object.keys(dict).sort()).toEqual(enKeys);
      for (const key of enKeys) {
        expect(dict[key].trim().length, `${lang}.${key} must be non-empty`).toBeGreaterThan(0);
      }
    }
  });

  it("preserves identical {placeholder} tokens across every language", () => {
    for (const [key, enVal] of Object.entries(en)) {
      const expected = extractPlaceholders(enVal);
      for (const lang of ["es", "fr", "de", "it"] as const) {
        const dict = DICTS[lang] as Record<string, string>;
        const actual = extractPlaceholders(dict[key]);
        expect(actual, `placeholder mismatch for ${lang}.${key}`).toEqual(expected);
      }
    }
  });

  it("translates keys, interpolates parameters, and falls back safely", () => {
    expect(t("hud.time_left", { h: 2, m: 15 })).toBe("2 h 15 min left");
    expect(t("guard.slope", { slope: 27, max: 20, unit: "rover-1" })).toBe(
      "27° slope exceeds the 20° limit of rover-1",
    );

    setLang("es");
    expect(t("hud.time_left", { h: 2, m: 15 })).toBe("Quedan 2 h 15 min");
    expect(t("guard.pod_keepout", { d: 8, min: 15 })).toBe("Blanco a 8 m del astronauta; mínimo 15 m");

    // Missing parameter leaves placeholder intact without crashing
    expect(t("alert.leak")).toBe("FUGA EN EL TRAJE. Pérdida de conciencia en {t}");
    // Unknown key falls back to the key string
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("switches languages via setLang and notifies onLangChange listeners", () => {
    const spy = vi.fn();
    const unsub = onLangChange(spy);

    setLang("fr");
    expect(getLang()).toBe("fr");
    expect(t("menu.provenance")).toBe("Provenance");
    expect(spy).toHaveBeenCalledWith("fr");

    setLang("de");
    expect(getLang()).toBe("de");
    expect(t("menu.layers")).toBe("Ebenen");

    setLang("it");
    expect(getLang()).toBe("it");
    expect(t("storm.verdict.no_go")).toBe("ANNULLATO");

    // Invalid language is ignored
    setLang("pt" as never);
    expect(getLang()).toBe("it");
    expect(spy).toHaveBeenCalledTimes(3);

    unsub();
    setLang("en");
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("formats numbers using the active locale with fmt()", () => {
    setLang("en");
    expect(fmt(1234.56, 1)).toBe((1234.56).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

    setLang("es");
    expect(fmt(1234.56, 2)).toBe((1234.56).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  });
});
