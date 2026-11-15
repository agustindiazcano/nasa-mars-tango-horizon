import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Document chunk returned by the BM25 knowledge search. */
export interface DocChunk {
  doc: string;
  page: number;
  text: string;
  fault_codes?: string[];
  score?: number;
}

interface Posting {
  idx: number;
  tf: number;
}

const BM25_K1 = 1.5;
const BM25_B = 0.75;

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "will",
  "with",
]);

const SUB_SUPER_MAP: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

function normalizeToken(tok: string): string {
  if (tok.length > 4 && tok.endsWith("ies")) {
    return `${tok.slice(0, -3)}y`;
  }
  if (
    tok.length > 4 &&
    tok.endsWith("s") &&
    !tok.endsWith("ss") &&
    !tok.endsWith("us") &&
    !tok.endsWith("is") &&
    !tok.endsWith("as")
  ) {
    return tok.slice(0, -1);
  }
  return tok;
}

function tokenize(raw: string): string[] {
  const normalized = raw
    .replace(/[₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUB_SUPER_MAP[ch] ?? ch)
    .toLowerCase();
  const matches = normalized.match(/[a-z0-9]+/g);
  if (!matches) return [];
  const tokens: string[] = [];
  for (const m of matches) {
    if (STOPWORDS.has(m)) continue;
    if (m.length === 1 && (m < "0" || m > "9")) continue;
    tokens.push(normalizeToken(m));
  }
  return tokens;
}

function resolveCorpusPath(): string | null {
  const candidates = [
    // Works from both server/src/agents/tools/knowledge.ts and server/dist/agents/tools/knowledge.js
    fileURLToPath(new URL("../../../corpus/chunks.json", import.meta.url)),
    resolve(process.cwd(), "corpus/chunks.json"),
    resolve(process.cwd(), "server/corpus/chunks.json"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

interface Bm25Index {
  chunks: DocChunk[];
  docLengths: Float64Array;
  avgDocLength: number;
  idf: Map<string, number>;
  postings: Map<string, Posting[]>;
  faultCodeIndex: Map<string, Set<number>>;
}

function buildIndex(): Bm25Index {
  const corpusPath = resolveCorpusPath();
  if (!corpusPath) {
    return {
      chunks: [],
      docLengths: new Float64Array(0),
      avgDocLength: 0,
      idf: new Map(),
      postings: new Map(),
      faultCodeIndex: new Map(),
    };
  }

  const raw = readFileSync(corpusPath, "utf-8");
  const parsed = JSON.parse(raw) as DocChunk[];
  const n = parsed.length;
  const docLengths = new Float64Array(n);
  const postings = new Map<string, Posting[]>();
  const faultCodeIndex = new Map<string, Set<number>>();

  let totalLength = 0;
  for (let idx = 0; idx < n; idx++) {
    const chunk = parsed[idx];
    if (Array.isArray(chunk.fault_codes)) {
      for (const rawCode of chunk.fault_codes) {
        const code = String(rawCode).trim().toUpperCase();
        if (!code) continue;
        let set = faultCodeIndex.get(code);
        if (!set) {
          set = new Set<number>();
          faultCodeIndex.set(code, set);
        }
        set.add(idx);
      }
    }
    const codeText = Array.isArray(chunk.fault_codes) ? chunk.fault_codes.join(" ") : "";
    const tokens = tokenize(`${chunk.doc} ${codeText} ${chunk.text}`);
    docLengths[idx] = tokens.length;
    totalLength += tokens.length;

    const termCounts = new Map<string, number>();
    for (const tok of tokens) {
      termCounts.set(tok, (termCounts.get(tok) ?? 0) + 1);
    }
    for (const [term, tf] of termCounts) {
      let list = postings.get(term);
      if (!list) {
        list = [];
        postings.set(term, list);
      }
      list.push({ idx, tf });
    }
  }

  const avgDocLength = n > 0 ? totalLength / n : 0;
  const idf = new Map<string, number>();
  for (const [term, list] of postings) {
    const df = list.length;
    idf.set(term, Math.log(1 + (n - df + 0.5) / (df + 0.5)));
  }

  return { chunks: parsed, docLengths, avgDocLength, idf, postings, faultCodeIndex };
}

const INDEX = buildIndex();

/**
 * Search the in-memory NASA/OCHMO BM25 corpus and return top-k matching chunks
 * with exact document names, 1-based page numbers, and relevance scores.
 * Optionally pre-filters chunks by canonical FDIR `fault_codes` metadata before ranking.
 */
export function searchDocs(query: string, k = 3, faultCodes?: string[]): DocChunk[] {
  if (!query || k <= 0 || INDEX.chunks.length === 0) return [];
  const terms = Array.from(new Set(tokenize(query)));
  if (terms.length === 0) return [];

  let allowed: Set<number> | null = null;
  if (Array.isArray(faultCodes)) {
    const cleanedCodes = faultCodes.map((c) => c.trim().toUpperCase()).filter(Boolean);
    if (cleanedCodes.length > 0) {
      allowed = new Set<number>();
      for (const code of cleanedCodes) {
        const matches = INDEX.faultCodeIndex.get(code);
        if (matches) {
          for (const idx of matches) allowed.add(idx);
        }
      }
      if (allowed.size === 0) return [];
    }
  }

  const scores = new Map<number, number>();
  const avgdl = INDEX.avgDocLength || 1;

  for (const term of terms) {
    const list = INDEX.postings.get(term);
    if (!list) continue;
    const termIdf = INDEX.idf.get(term) ?? 0;

    for (let i = 0; i < list.length; i++) {
      const { idx, tf } = list[i];
      if (allowed && !allowed.has(idx)) continue;
      const dl = INDEX.docLengths[idx];
      const norm = 1 - BM25_B + BM25_B * (dl / avgdl);
      const tfWeight = (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * norm);
      scores.set(idx, (scores.get(idx) ?? 0) + termIdf * tfWeight);
    }
  }

  if (scores.size === 0) return [];

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([idx, score]) => {
      const c = INDEX.chunks[idx];
      return {
        doc: c.doc,
        page: c.page,
        text: c.text,
        ...(c.fault_codes?.length ? { fault_codes: c.fault_codes } : {}),
        score: Number(score.toFixed(4)),
      };
    });
}
