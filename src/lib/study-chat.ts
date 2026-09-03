import { examDisplayName, examTypeLabel } from "./format";
import type {
  ExamenEnPreparacion,
  GroundingPayload,
  Material,
  StudyExamSummary,
  StudySourceKind,
  Tema,
} from "./types";

export type { GroundingPayload, StudyExamSummary, StudySourceKind };

export type StudySource = {
  name: string;
  kind: StudySourceKind;
  text: string | null;
};

export type StudyContext = {
  materiaId: string;
  materiaName: string;
  sources: StudySource[];
  exams: StudyExamSummary[];
};

const STOPWORDS = new Set([
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "de",
  "del",
  "al",
  "a",
  "y",
  "o",
  "u",
  "en",
  "con",
  "por",
  "para",
  "que",
  "qué",
  "cual",
  "cuál",
  "como",
  "cómo",
  "cuando",
  "cuándo",
  "donde",
  "dónde",
  "es",
  "son",
  "ser",
  "se",
  "su",
  "sus",
  "tu",
  "tus",
  "mi",
  "mis",
  "lo",
  "le",
  "les",
  "me",
  "te",
  "nos",
  "ya",
  "si",
  "sí",
  "no",
  "hay",
  "este",
  "esta",
  "esto",
  "estos",
  "estas",
  "ese",
  "esa",
  "eso",
  "muy",
  "mas",
  "más",
  "pero",
  "porque",
  "sobre",
  "entre",
  "sin",
  "también",
  "hasta",
  "desde",
  "todo",
  "toda",
  "todos",
  "todas",
  "algo",
  "nada",
  "quien",
  "quién",
  "cuales",
  "cuáles",
  "tiene",
  "tienen",
  "tengo",
  "hace",
  "hacer",
  "puede",
  "pueden",
  "puedo",
  "decir",
  "dijo",
  "explica",
  "explique",
  "definí",
  "defini",
  "definición",
  "definicion",
]);

export function groundingFromContext(ctx: StudyContext): GroundingPayload {
  return {
    materiaId: ctx.materiaId,
    materiaName: ctx.materiaName,
    sourceCount: ctx.sources.length,
    readableCount: ctx.sources.filter((s) => Boolean(s.text?.trim())).length,
    sources: ctx.sources.map((s) => ({
      name: s.name,
      kind: s.kind,
      readable: Boolean(s.text?.trim()),
    })),
    exams: ctx.exams,
  };
}

export function sourcesFromMateriales(materiales: Material[]): StudySource[] {
  return materiales.map((material) => ({
    name: material.name,
    kind: material.kind === "examen" ? "examen" : "apunte",
    text: material.contentBase64
      ? extractTextFromBase64(
          material.name,
          material.type,
          material.contentBase64
        )
      : null,
  }));
}

export function sourcesFromExamen(examen: ExamenEnPreparacion): StudySource[] {
  const sources: StudySource[] = [];
  const examName = examDisplayName(examen);
  const note = examen.note?.trim();
  if (note) {
    sources.push({
      name: `Nota · ${examName}`,
      kind: "examen",
      text: note,
    });
  }
  if (examen.fileContentBase64) {
    sources.push({
      name: examen.fileName || `Archivo · ${examName}`,
      kind: "examen",
      text: extractTextFromBase64(
        examen.fileName || examName,
        examen.fileType || "",
        examen.fileContentBase64
      ),
    });
  }
  return sources;
}

export function summarizeExamen(
  examen: ExamenEnPreparacion,
  temas: Tema[]
): StudyExamSummary {
  return {
    name: examDisplayName(examen),
    typeLabel: examTypeLabel(examen.type),
    date: examen.date,
    objective: examen.objective?.trim() || undefined,
    temas: temas.map((t) => t.name),
  };
}

export function extractTextFromBase64(
  name: string,
  type: string,
  contentBase64: string
): string | null {
  const buffer = Buffer.from(contentBase64, "base64");
  if (buffer.length === 0) return null;

  const lower = name.toLowerCase();
  const mime = (type || "").toLowerCase();

  if (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    /\.(png|jpe?g|gif|webp|avif|mp4|mov|webm|mp3|wav|docx|pptx|xlsx|zip)$/i.test(
      lower
    )
  ) {
    return null;
  }

  if (mime.includes("pdf") || lower.endsWith(".pdf")) {
    const pdfText = extractPdfText(buffer);
    return pdfText.trim() ? pdfText.trim() : null;
  }

  const text = buffer
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\0/g, "");
  if (!looksLikeText(text)) return null;
  return text.trim() ? text.trim() : null;
}

export function composeStudyReply(
  question: string,
  ctx: StudyContext | null
): { content: string; citations: string[] } {
  if (!ctx) {
    return {
      content:
        "Abrí una materia para estudiar. El chat responde con tus apuntes y archivos de examen, no con un programa inventado.",
      citations: [],
    };
  }

  const readable = ctx.sources.filter((s) => Boolean(s.text?.trim()));
  const unreadable = ctx.sources.filter((s) => !s.text?.trim());

  if (readable.length === 0) {
    return {
      content: emptyMaterialReply(ctx, unreadable),
      citations: [],
    };
  }

  const match = findBestPassage(question, readable);
  if (!match) {
    return {
      content: noMatchReply(ctx, readable, unreadable),
      citations: readable.map((s) => s.name),
    };
  }

  const quote = clip(match.passage, 420);
  const kindLabel =
    match.source.kind === "examen" ? "archivo del examen" : "apunte";
  const examHint = examHintLine(ctx);

  return {
    content: [
      `Según tu ${kindLabel} «${match.source.name}» en ${ctx.materiaName}:`,
      "",
      `«${quote}»`,
      "",
      examHint ||
        "Eso es lo que dice tu material. Cubrirlo en el apunte no es lo mismo que haberlo practicado para rendir.",
    ].join("\n"),
    citations: [match.source.name],
  };
}

function emptyMaterialReply(
  ctx: StudyContext,
  unreadable: StudySource[]
): string {
  const examLine = examHintLine(ctx);
  if (unreadable.length > 0) {
    const names = unreadable.map((s) => s.name).join(", ");
    return [
      `En ${ctx.materiaName} tenés ${names}, pero no pude leer el texto (imagen, video o PDF sin texto seleccionable).`,
      "Subí un .txt, .md o un PDF con texto para que pueda responder desde tu material.",
      examLine,
      "Mientras no pueda leer el contenido, no voy a decirte que estás preparado.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (ctx.exams.length > 0) {
    return [
      `Todavía no hay apuntes ni archivos de examen con texto en ${ctx.materiaName}.`,
      examLine,
      "Sin ese material no puedo estudiar el contenido con vos ni afirmar que estás preparado para rendir.",
      "Cargá apuntes en Apuntes y preguntame de nuevo.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return `Todavía no hay apuntes ni archivos de examen en ${ctx.materiaName}. No voy a inventar el programa ni decirte que estás preparado. Cargá material en Apuntes y preguntame de nuevo.`;
}

function noMatchReply(
  ctx: StudyContext,
  readable: StudySource[],
  unreadable: StudySource[]
): string {
  const covered = readable
    .map((s) => `«${s.name}» (${firstLine(s.text || "")})`)
    .join("; ");
  const unread =
    unreadable.length > 0
      ? ` También tenés ${unreadable.map((s) => s.name).join(", ")}, que no pude leer.`
      : "";
  const examLine = examHintLine(ctx);
  return [
    `Revisé el material de ${ctx.materiaName} y no encontré una respuesta directa a eso.`,
    `Lo que sí está en tus archivos: ${covered}.${unread}`,
    examLine,
    "Si el tema entra en el examen, cargá un apunte que lo cubra. No puedo afirmar que estés preparado sobre algo que no está en tu material.",
  ]
    .filter(Boolean)
    .join(" ");
}

function examHintLine(ctx: StudyContext): string {
  if (ctx.exams.length === 0) return "";
  const exam = ctx.exams[0];
  const temas =
    exam.temas.length > 0 ? ` Temas: ${exam.temas.join(", ")}.` : "";
  const objective = exam.objective ? ` Objetivo: ${exam.objective}.` : "";
  return `Examen cargado: ${exam.name} (${exam.typeLabel}, ${exam.date}).${temas}${objective}`.trim();
}

function findBestPassage(
  question: string,
  sources: StudySource[]
): { source: StudySource; passage: string; score: number } | null {
  const qTokens = tokenize(question);
  if (qTokens.size === 0) return null;

  let best: { source: StudySource; passage: string; score: number } | null =
    null;

  for (const source of sources) {
    const text = source.text;
    if (!text) continue;
    for (const passage of chunkText(text)) {
      const score = overlapScore(qTokens, tokenize(passage));
      if (!best || score > best.score) {
        best = { source, passage, score };
      }
    }
  }

  if (!best || best.score < 0.18) return null;
  return best;
}

function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const paragraph of paragraphs.length ? paragraphs : [normalized]) {
    if (paragraph.length <= 480) {
      chunks.push(paragraph);
      continue;
    }
    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let current = "";
    for (const sentence of sentences) {
      if ((current + " " + sentence).trim().length > 480 && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current = (current + " " + sentence).trim();
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks.length ? chunks : [normalized.slice(0, 480)];
}

function tokenize(text: string): Set<string> {
  const folded = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const parts = folded.split(/[^a-z0-9]+/g);
  const tokens = new Set<string>();
  for (const part of parts) {
    if (part.length < 3) continue;
    if (STOPWORDS.has(part)) continue;
    tokens.add(part);
  }
  return tokens;
}

function overlapScore(question: Set<string>, passage: Set<string>): number {
  if (question.size === 0 || passage.size === 0) return 0;
  let hit = 0;
  for (const token of question) {
    if (passage.has(token)) hit += token.length >= 6 ? 1.4 : 1;
  }
  return hit / question.size;
}

function firstLine(text: string): string {
  const line = text.split(/\n/).map((s) => s.trim()).find(Boolean) || text;
  return clip(line, 80);
}

function clip(text: string, max: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trim()}…`;
}

function looksLikeText(text: string): boolean {
  const sample = text.slice(0, 2500);
  if (!sample.trim()) return false;
  const chars = [...sample];
  let printable = 0;
  for (const char of chars) {
    const code = char.charCodeAt(0);
    if (code === 9 || code === 10 || code === 13 || code >= 32) printable += 1;
  }
  return printable / chars.length >= 0.85;
}

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const pieces: string[] = [];

  const tj = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = tj.exec(raw))) {
    pieces.push(pdfLiteralToString(match[0]));
  }

  const tjArray = /\[([\s\S]*?)\]\s*TJ/g;
  while ((match = tjArray.exec(raw))) {
    const inner = match[1];
    const literals = inner.match(/\((?:\\.|[^\\)])*\)/g) || [];
    pieces.push(literals.map(pdfLiteralToString).join(""));
  }

  return pieces
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfLiteralToString(literal: string): string {
  const inner = literal.replace(/\)\s*Tj$/, "");
  const start = inner.indexOf("(");
  const end = inner.lastIndexOf(")");
  if (start < 0 || end <= start) return "";
  const body = inner.slice(start + 1, end);
  return body
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\(\d{1,3})/g, (_, oct) =>
      String.fromCharCode(parseInt(oct, 8))
    );
}
