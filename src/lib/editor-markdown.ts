import { normalizeMathDelimiters } from "./chat-markdown.ts";

type Fence = { marker: string; length: number };

function openFence(line: string): Fence | null {
  const match = line.match(/^\s{0,3}(`{3,}|~{3,})/);
  return match ? { marker: match[1][0], length: match[1].length } : null;
}

function closesFence(line: string, fence: Fence): boolean {
  const match = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
  return Boolean(match && match[1][0] === fence.marker && match[1].length >= fence.length);
}

function mapProseLines(markdown: string, transform: (line: string) => string | null): string {
  const result: string[] = [];
  let fence: Fence | null = null;
  for (const line of markdown.split("\n")) {
    if (fence) {
      result.push(line);
      if (closesFence(line, fence)) fence = null;
      continue;
    }
    fence = openFence(line);
    if (fence) {
      result.push(line);
      continue;
    }
    const mapped = transform(line);
    if (mapped !== null) result.push(mapped);
  }
  return result.join("\n");
}

const BR = String.raw`<br\s*\/?>`;
const LONE_BR = new RegExp(String.raw`^(\s*(?:>\s*)*(?:(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)?)${BR}\s*$`);
const BR_CELL = new RegExp(String.raw`(\|)\s*${BR}\s*(?=\|)`, "g");

function dropEmptyLinePlaceholders(markdown: string): string {
  if (!/<br/i.test(markdown)) return markdown;
  return mapProseLines(markdown, (line) => {
    const lone = line.match(LONE_BR);
    if (lone) return lone[1].trim() ? lone[1].trimEnd() : null;
    return /^\s*\|/.test(line) ? line.replace(BR_CELL, "$1  ") : line;
  });
}

export function normalizeEditorMarkdown(md: string): string {
  return normalizeMathDelimiters(dropEmptyLinePlaceholders(md));
}

const TEX_SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η",
  theta: "θ", vartheta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π",
  rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  nabla: "∇", partial: "∂", infty: "∞", times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓",
  leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠", approx: "≈", equiv: "≡", sim: "∼",
  to: "→", rightarrow: "→", leftarrow: "←", Rightarrow: "⇒", Leftrightarrow: "⇔", iff: "⇔", implies: "⇒",
  in: "∈", notin: "∉", subset: "⊂", subseteq: "⊆", cup: "∪", cap: "∩", emptyset: "∅", forall: "∀", exists: "∃",
  int: "∫", iint: "∬", oint: "∮", sum: "∑", prod: "∏", sqrt: "√", ldots: "…", cdots: "⋯", dots: "…", circ: "∘",
};

function texPlano(tex: string): string {
  return tex
    .replace(/\\(?:frac|dfrac|tfrac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2")
    .replace(/\\(?:left|right|big|Big|bigg|Bigg)\b/g, "")
    .replace(/\\(?:mathrm|mathbf|mathit|mathbb|mathcal|operatorname|text|textbf|vec|hat|bar|overline)\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\([a-zA-Z]+)/g, (_, name: string) => TEX_SYMBOLS[name] ?? (/^(?:sin|cos|tan|log|ln|exp|lim|max|min|det)$/.test(name) ? name : " "))
    .replace(/\\[,;:! ]/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sinCodigoNiFormulas(markdown: string): string {
  const lines: string[] = [];
  let fence: Fence | null = null;
  let display = false;
  for (const line of markdown.split("\n")) {
    if (fence) {
      if (closesFence(line, fence)) fence = null;
      continue;
    }
    if (display) {
      if (/\$\$\s*$/.test(line)) display = false;
      continue;
    }
    fence = openFence(line);
    if (fence) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith("$$")) {
      if (trimmed === "$$" || !/\$\$\s*$/.test(trimmed.slice(2))) display = true;
      continue;
    }
    lines.push(line);
  }
  return lines.join("\n");
}

export function extractoPlano(markdown: string, max = 120): string {
  const plano = sinCodigoNiFormulas(markdown)
    .replace(/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<![\s\\])\$(?!\d)/g, (_, antes: string, tex: string) => `${antes}${texPlano(tex)}`)
    .replace(/<\/?[a-zA-Z][^>\n]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt: string) => (/^\s*\d+(?:\.\d+)?\s*$/.test(alt) ? " " : alt))
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/gm, "")
    .replace(/^\s*\|?(?:\s*:?-+:?\s*\|)+\s*(?::?-+:?\s*)?$/gm, " ")
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/(\*\*|__|~~|`)/g, "")
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_]/g, "$1$2")
    .replace(/\\([\\`*_{}[\]()#+\-.!$|])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (plano.length <= max) return plano;
  const corte = plano.slice(0, max);
  const espacio = corte.lastIndexOf(" ");
  return `${(espacio > max * 0.6 ? corte.slice(0, espacio) : corte).trimEnd()}…`;
}
