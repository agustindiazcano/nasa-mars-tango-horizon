import { afterEach, describe, expect, it } from "vitest";
import { LANGS, setLang, t } from "@th/shared";
import { markerPercent, VEIN_LOCALIZATION_VALIDATED, veinMetric } from "./veinDetector";

afterEach(() => setLang("en"));

describe("vein presentation", () => {
  it("places normalized coordinates over the full image, including edges", () => {
    expect(markerPercent({ u: .25, v: .75 })).toEqual({ left: "25%", top: "75%" });
    expect(markerPercent({ u: 0, v: 1 })).toEqual({ left: "0%", top: "100%" });
    expect(() => markerPercent({ u: 2, v: 0 })).toThrow();
  });
  it("keeps unvalidated spatial localization off", () => {
    expect(VEIN_LOCALIZATION_VALIDATED).toBe(false);
  });
  it("distinguishes image percentages from global ROC-AUC and missing values", () => {
    setLang("en");
    expect(veinMetric(0, true)).toBe("0.00 %");
    expect(veinMetric(.8453)).toBe("0.8453");
    expect(veinMetric(undefined)).toBe(t("veins.unavailable"));
  });
  it("provides translated controls and scientific limitations in five languages", () => {
    const titles = new Set<string>();
    for (const lang of LANGS) {
      setLang(lang);
      titles.add(t("veins.title"));
      for (const key of ["veins.photo", "veins.localization_pending", "veins.metrics_note", "veins.error", "science.vein_disclaimer"]) {
        expect(t(key)).not.toBe(key);
      }
    }
    expect(titles.size).toBe(5);
  });
});
