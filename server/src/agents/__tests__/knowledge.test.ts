import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { searchDocs, type DocChunk } from "../tools/knowledge.js";

function assertValidCitations(results: DocChunk[], expectedMin = 1): void {
  expect(results.length).toBeGreaterThanOrEqual(expectedMin);
  for (const chunk of results) {
    expect(typeof chunk.doc).toBe("string");
    expect(chunk.doc.length).toBeGreaterThan(0);
    expect(Number.isInteger(chunk.page)).toBe(true);
    expect(chunk.page).toBeGreaterThanOrEqual(1);
    expect(typeof chunk.text).toBe("string");
    expect(chunk.text.length).toBeGreaterThan(20);
    expect(typeof chunk.score).toBe("number");
    expect(chunk.score!).toBeGreaterThan(0);
  }
}

describe("BM25 knowledge search (searchDocs)", () => {
  it("retrieves NASA-STD-3001 O2 partial pressure and hypoxia limits", () => {
    const results = searchDocs("O2 partial pressure hypoxia PIO2 limit", 3);
    assertValidCitations(results);
    const combined = results.map((r) => `${r.doc} ${r.text}`).join(" ");
    expect(combined).toMatch(/NASA-STD-3001/i);
    expect(combined).toMatch(/hypoxia|PIO2|PAO2|mmHg|kPa/i);
  });

  it("retrieves CO2 and hypercapnia limits from NASA-STD-3001 and OCHMO-TB-004", () => {
    const results = searchDocs("CO2 inspired partial pressure limits hypercapnia", 3);
    assertValidCitations(results);
    const docs = results.map((r) => r.doc).join(" ");
    expect(docs).toMatch(/NASA-STD-3001|OCHMO-TB-004/i);
    const texts = results.map((r) => r.text).join(" ");
    expect(texts).toMatch(/PICO2|ppCO2|hypercapnia|4\.0 mmHg|15\.0 mmHg/i);
  });

  it("retrieves radiation career effective dose and organ limits", () => {
    const results = searchDocs("radiation career effective dose limit 600 mSv BFO", 3);
    assertValidCitations(results);
    const combined = results.map((r) => `${r.doc} ${r.text}`).join(" ");
    expect(combined).toMatch(/NASA-STD-3001/i);
    expect(combined).toMatch(/600 mSv|ALARA|BFO|mGy-Eq/i);
  });

  it("retrieves spacesuit operating pressure and decompression sickness limits", () => {
    const results = searchDocs("suit pressure 29.6 kPa decompression sickness EVA", 3);
    assertValidCitations(results);
    const combined = results.map((r) => `${r.doc} ${r.text}`).join(" ");
    expect(combined).toMatch(/29\.6 kPa|4\.3 psia|40 kPa|55\.2 kPa/i);
    expect(combined).toMatch(/decompression|DCS|suit/i);
  });

  it("retrieves EVA medical care, AMCL, and MEDPRAT references", () => {
    const evaMed = searchDocs("EVA medical care suit breach Armstrong limit DCS", 3);
    assertValidCitations(evaMed);
    const evaCombined = evaMed.map((r) => `${r.doc} ${r.text}`).join(" ");
    expect(evaCombined).toMatch(/OCHMO|NASA-STD-3001|AMCL/i);
    expect(evaCombined).toMatch(/Armstrong|decompression|medical/i);

    const amcl = searchDocs("Accepted Medical Condition List exploration medical capability", 3);
    assertValidCitations(amcl);
    expect(amcl.some((r) => /AMCL|NTRS_20190027540/i.test(r.doc))).toBe(true);
  });

  it("retrieves Mars atmosphere and MOXIE ISRU documentation", () => {
    const gram = searchDocs("Mars-GRAM atmospheric density dust storm", 3);
    assertValidCitations(gram);
    expect(gram.some((r) => /Mars-GRAM/i.test(r.doc))).toBe(true);

    const moxie = searchDocs("MOXIE oxygen production solid oxide electrolysis", 3);
    assertValidCitations(moxie);
    expect(moxie.some((r) => /MOXIE/i.test(r.doc))).toBe(true);
  });

  it("executes queries in under 2 ms", () => {
    const queries = [
      "O2 partial pressure hypoxia",
      "CO2 limits spacesuit",
      "radiation dose limit 600 mSv",
      "suit pressure 29.6 kPa",
      "EVA medical care decompression sickness",
    ];
    // Warm up JIT once before measuring.
    searchDocs("warmup query", 3);

    const start = performance.now();
    for (const q of queries) {
      const res = searchDocs(q, 3);
      expect(res.length).toBeLessThanOrEqual(3);
    }
    const elapsedMs = performance.now() - start;
    const avgMs = elapsedMs / queries.length;
    expect(avgMs).toBeLessThan(2);
  });

  it("handles empty, zero-k, and non-matching queries safely", () => {
    expect(searchDocs("", 3)).toEqual([]);
    expect(searchDocs("   ", 3)).toEqual([]);
    expect(searchDocs("oxygen", 0)).toEqual([]);
    expect(searchDocs("xyzzyplughnonexistenttoken999", 3)).toEqual([]);
  });
});
