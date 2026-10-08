import { normalizeMathDelimiters } from "./chat-markdown.ts";

export function normalizeEditorMarkdown(md: string): string {
  return normalizeMathDelimiters(md);
}

export function extractoPlano(markdown: string, max = 120): string {
  const plano = markdown
    .replace(/^```[^\n]*\n[\s\S]*?(?:\n```|$)/gm, " ")
    .replace(/^\s*\$\$[\s\S]*?\$\$/gm, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
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
