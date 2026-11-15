const GREEK: Record<string, string> = {
  tau: "tau",
  mu: "micro",
  Delta: "delta",
  delta: "delta",
  deg: " degrees",
  degree: " degrees",
  circ: " degrees",
  approx: "about",
  sim: "about",
  pm: "plus or minus",
  times: "x",
  cdot: "x",
  le: "<=",
  leq: "<=",
  ge: ">=",
  geq: ">=",
};

/** Strips Markdown and LaTeX markup from an agent reply so text-to-speech does not read symbols aloud. */
export function plainSpeech(text: string): string {
  return text
    .replace(/\$\$?([^$\n]{1,80})\$\$?/g, "$1") // $\tau$ -> \tau
    .replace(/\\(?:text|mathrm|mathbf)\{([^}]*)\}/g, "$1")
    .replace(/\^\{?\\circ\}?/g, " degrees")
    .replace(/\\([A-Za-z]+)/g, (_m, name: string) => GREEK[name] ?? name)
    .replace(/[_^]\{([^}]*)\}/g, "$1")
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\[([^\]]+)\]\((?:https?:)?[^)]*\)/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s*\n+\s*/g, " ")
    .trim();
}
