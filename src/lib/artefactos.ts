import type { ArtefactoTipo } from "./types";
import { fechaCorta, hoyYmd } from "./fechas.ts";

export type ArtefactoBlock = {
  id?: string;
  tipo: ArtefactoTipo;
  titulo: string;
  contenido: string;
};

const BLOCK = /<artefacto\b([^>]*)>([\s\S]*?)(?:<\/artefacto>|$)/gi;
const ATTR = /(\w+)\s*=\s*"([^"]*)"/g;
export const ARTEFACTO_MARKER = /\[\[artefacto:([0-9a-f-]{36})\]\]/gi;

export function extractArtefactos(text: string): {
  text: string;
  blocks: ArtefactoBlock[];
  replace: (ids: string[]) => string;
} {
  const blocks: ArtefactoBlock[] = [];
  const pieces: (string | number)[] = [];
  let last = 0;
  for (const match of text.matchAll(BLOCK)) {
    const attrs: Record<string, string> = {};
    for (const attr of match[1].matchAll(ATTR)) {
      attrs[attr[1].toLowerCase()] = attr[2].trim();
    }
    const contenido = stripFence(match[2]);
    if (!contenido) continue;
    pieces.push(text.slice(last, match.index));
    pieces.push(blocks.length);
    last = (match.index ?? 0) + match[0].length;
    blocks.push({
      id: attrs.id || undefined,
      tipo: attrs.tipo === "examen" ? "examen" : "documento",
      titulo: attrs.titulo || firstHeading(contenido) || "Documento",
      contenido,
    });
  }
  pieces.push(text.slice(last));
  const replace = (ids: string[]) =>
    pieces
      .map((piece) =>
        typeof piece === "number" ? `\n\n[[artefacto:${ids[piece]}]]\n\n` : piece
      )
      .join("")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  return { text, blocks, replace };
}

export function splitArtefactoMarkers(
  content: string
): ({ kind: "text"; text: string } | { kind: "artefacto"; id: string })[] {
  const parts: ({ kind: "text"; text: string } | { kind: "artefacto"; id: string })[] = [];
  let last = 0;
  for (const match of content.matchAll(ARTEFACTO_MARKER)) {
    const before = content.slice(last, match.index).trim();
    if (before) parts.push({ kind: "text", text: before });
    parts.push({ kind: "artefacto", id: match[1] });
    last = (match.index ?? 0) + match[0].length;
  }
  const rest = content.slice(last).trim();
  if (rest) parts.push({ kind: "text", text: rest });
  return parts;
}

const CITATIONS_COMMENT = /<!--\s*ARQUIMES_CITATIONS:[\s\S]*?-->/gi;
const ANY_HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/m;

export function apunteDesdeChat(
  contenido: string,
  titulo?: string,
  now: Date = new Date()
): { titulo: string; contenido: string } {
  const limpio = splitArtefactoMarkers(contenido.replace(CITATIONS_COMMENT, ""))
    .flatMap((part) => (part.kind === "text" ? [part.text] : []))
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const heading = limpio.match(ANY_HEADING)?.[1]?.replace(/[*_`]/g, "").trim();
  return {
    titulo:
      titulo?.trim() ||
      heading ||
      `Apunte del chat · ${fechaCorta(hoyYmd(now)) ?? ""}`.trim(),
    contenido: limpio,
  };
}

function stripFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

function firstHeading(markdown: string): string | undefined {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

export type PreguntaOpcion = { texto: string; correcta: boolean };

export type Pregunta = {
  numero: number;
  enunciado: string;
  tema?: string;
  opciones: PreguntaOpcion[];
  explicacion?: string;
  respuesta?: string;
};

export type ExamenParseado = {
  intro: string;
  preguntas: Pregunta[];
};

const QUESTION_HEADING = /^#{2,3}\s*(?:Pregunta\s*)?(\d+)[.)\-:]?\s*(.*)$/i;
const OPTION = /^\s*[-*]\s*\[( |x|X)\]\s*(.+)$/;
const TEMA = /^\s*\**Tema\**\s*:\s*\**\s*(.+?)\s*\**\s*$/i;
const QUOTE = /^\s*>\s?(.*)$/;

export function parseExamen(markdown: string): ExamenParseado {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const intro: string[] = [];
  const preguntas: Pregunta[] = [];
  let current: { pregunta: Pregunta; body: string[]; quote: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const quote = current.quote.join("\n").trim();
    const labelled = quote.match(/^\**\s*(Respuesta(?: modelo)?|Explicación|Solución)\s*\**\s*:\s*\**\s*([\s\S]*)$/i);
    const quoteText = labelled ? labelled[2].trim() : quote;
    if (quoteText) {
      if (current.pregunta.opciones.length > 0) current.pregunta.explicacion = quoteText;
      else current.pregunta.respuesta = quoteText;
    }
    current.pregunta.enunciado = [current.pregunta.enunciado, current.body.join("\n").trim()]
      .filter(Boolean)
      .join("\n\n");
    preguntas.push(current.pregunta);
    current = null;
  };

  for (const line of lines) {
    const heading = line.match(QUESTION_HEADING);
    if (heading) {
      flush();
      current = {
        pregunta: {
          numero: Number(heading[1]),
          enunciado: heading[2].trim(),
          opciones: [],
        },
        body: [],
        quote: [],
      };
      continue;
    }
    if (!current) {
      intro.push(line);
      continue;
    }
    const option = line.match(OPTION);
    if (option) {
      current.pregunta.opciones.push({
        texto: option[2].trim(),
        correcta: option[1].toLowerCase() === "x",
      });
      continue;
    }
    const tema = line.match(TEMA);
    if (tema && !current.pregunta.tema) {
      current.pregunta.tema = tema[1].replace(/\*+/g, "").trim();
      continue;
    }
    const quote = line.match(QUOTE);
    if (quote) {
      current.quote.push(quote[1]);
      continue;
    }
    if (current.quote.length > 0 && line.trim()) {
      current.quote.push(line);
      continue;
    }
    if (current.pregunta.opciones.length === 0) current.body.push(line);
  }
  flush();

  return { intro: intro.join("\n").trim(), preguntas };
}

export function normalizeTemaName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
