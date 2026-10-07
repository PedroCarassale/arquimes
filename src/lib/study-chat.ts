import { examDisplayName, examTypeLabel } from "./format";
import { extractText } from "unpdf";
import type {
  ExamenEnPreparacion,
  GroundingPayload,
  LecturaArchivo,
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
  materialId?: string;
  notaId?: string;
  unreadableHint?: string;
  lectura?: LecturaArchivo;
};

export type StudyArtefactoRef = {
  id: string;
  tipo: "examen" | "documento";
  titulo: string;
  version: number;
  contenido: string;
};

export type StudyContext = {
  materiaId: string;
  materiaName: string;
  sources: StudySource[];
  exams: StudyExamSummary[];
  artefactos?: StudyArtefactoRef[];
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
      materialId: s.materialId,
      notaId: s.notaId,
      lectura: s.lectura,
    })),
    exams: ctx.exams,
  };
}

export async function sourcesFromMateriales(
  materiales: Material[],
  fileMetaByStorageKey?: Map<
    string,
    {
      extractedText: string | null;
      extractionStatus?: string;
      extractionDetail?: string | null;
      lectura?: LecturaArchivo;
    }
  >
): Promise<StudySource[]> {
  const sources = await Promise.all(
    materiales.map(async (material) => {
      const storageMeta = material.storageKey
        ? fileMetaByStorageKey?.get(material.storageKey)
        : undefined;
      if (storageMeta) {
        return {
          name: material.name,
          kind: material.kind === "examen" ? "examen" : "apunte",
          text: storageMeta.extractedText,
          materialId: material.id,
          lectura: storageMeta.lectura,
          unreadableHint: unreadableHintFromStatus(
            storageMeta.extractionStatus,
            storageMeta.extractionDetail
          ),
        } as StudySource;
      }
      const legacyText = material.contentBase64
        ? await extractTextFromBase64(
            material.name,
            material.type,
            material.contentBase64
          )
        : null;
      return {
        name: material.name,
        kind: material.kind === "examen" ? "examen" : "apunte",
        text: legacyText,
        materialId: material.id,
      } as StudySource;
    })
  );
  return sources;
}

export async function sourcesFromExamen(
  examen: ExamenEnPreparacion
): Promise<StudySource[]> {
  const sources: StudySource[] = [];
  const examName = examDisplayName(examen);
  const note = examen.note?.trim();
  if (note) {
    sources.push({
      name: `Examen · ${examName}`,
      kind: "examen",
      text: note,
    });
  }
  if (examen.fileContentBase64) {
    const extracted = await extractTextFromBase64(
      examen.fileName || examName,
      examen.fileType || "",
      examen.fileContentBase64
    );
    sources.push({
      name: examen.fileName || `Archivo · ${examName}`,
      kind: "examen",
      text: extracted,
      materialId: examen.materialId,
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
    typeLabel:
      examen.kind === "entrega" ? "Entrega de trabajo práctico" : examTypeLabel(examen.type),
    date: examen.date || "",
    objective:
      examen.description?.trim() || examen.objective?.trim() || undefined,
    temas: temas.map((t) => t.name),
  };
}

export async function extractTextFromBase64(
  name: string,
  type: string,
  contentBase64: string
): Promise<string | null> {
  const buffer = Buffer.from(contentBase64, "base64");
  if (buffer.length === 0) return null;
  const extracted = await extractTextFromBuffer(name, type, buffer);
  return extracted.text;
}

export async function extractTextFromBuffer(
  name: string,
  type: string,
  buffer: Buffer
): Promise<{ text: string | null; status: string; detail?: string }> {
  if (buffer.length === 0) return { text: null, status: "empty" };

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
    return { text: null, status: "unsupported-media" };
  }

  if (mime.includes("pdf") || lower.endsWith(".pdf")) {
    const pdfExtract = await extractPdfText(buffer);
    if (pdfExtract.text.trim()) {
      return { text: pdfExtract.text.trim(), status: "pdf-text-layer" };
    }
    if (pdfExtract.errorDetail) {
      return {
        text: null,
        status: "pdf-text-error",
        detail: `No pude leer el PDF: ${pdfExtract.errorDetail}`,
      };
    }
    const ocr = await extractPdfTextWithOcr(name, type, buffer);
    return ocr;
  }

  const text = buffer
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\0/g, "");
  if (!looksLikeText(text)) return { text: null, status: "binary" };
  return { text: text.trim() ? text.trim() : null, status: "plain-text" };
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
    const hints = [
      ...new Set(
        unreadable.map((s) => s.unreadableHint?.trim()).filter(Boolean) as string[]
      ),
    ];
    return [
      `En ${ctx.materiaName} tenés ${names}, pero no pude leer el texto.`,
      hints.length ? hints.join(" ") : "Puede ser una imagen, video o PDF sin texto seleccionable.",
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
      ? ` También tenés ${unreadable.map((s) => s.name).join(", ")}, que no pude leer. ${
          [
            ...new Set(
              unreadable
                .map((s) => s.unreadableHint?.trim())
                .filter(Boolean) as string[]
            ),
          ].join(" ")
        }`
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

async function extractPdfText(
  buffer: Buffer
): Promise<{ text: string; errorDetail?: string }> {
  try {
    const extracted = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });
    const text = Array.isArray(extracted.text)
      ? extracted.text.join("\n")
      : extracted.text;
    return { text: (text || "").replace(/[ \t]+/g, " ").trim() };
  } catch (error) {
    return {
      text: "",
      errorDetail: error instanceof Error ? clip(error.message, 180) : "Error desconocido.",
    };
  }
}

async function extractPdfTextWithOcr(
  name: string,
  type: string,
  buffer: Buffer
): Promise<{ text: string | null; status: string; detail?: string }> {
  const endpoint = process.env.PDF_OCR_API_URL?.trim();
  if (!endpoint) {
    return {
      text: null,
      status: "pdf-ocr-unavailable",
      detail:
        "Parece un PDF escaneado sin texto seleccionable. Para leerlo hace falta OCR y no está configurado.",
    };
  }

  try {
    const token = process.env.PDF_OCR_API_KEY?.trim();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        fileName: name,
        mimeType: type || "application/pdf",
        contentBase64: buffer.toString("base64"),
      }),
    });
    if (!response.ok) {
      const detail = clip(await response.text(), 220);
      return {
        text: null,
        status: "pdf-ocr-error",
        detail: `No pude aplicar OCR al PDF (${response.status}). ${detail}`,
      };
    }
    const payload = (await response.json()) as { text?: unknown };
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text) {
      return {
        text: null,
        status: "pdf-ocr-empty",
        detail: "El OCR no devolvió texto legible para este PDF escaneado.",
      };
    }
    return { text, status: "pdf-ocr-success" };
  } catch (error) {
    const detail =
      error instanceof Error ? clip(error.message, 180) : "Error desconocido.";
    return {
      text: null,
      status: "pdf-ocr-error",
      detail: `Falló el OCR configurado: ${detail}`,
    };
  }
}

function unreadableHintFromStatus(status?: string, detail?: string | null): string | undefined {
  if (detail?.trim()) return detail.trim();
  if (!status) return undefined;
  if (status === "pdf-ocr-unavailable") {
    return "El PDF parece escaneado y falta configurar OCR para extraer texto.";
  }
  if (status === "ocr-pending" || status === "uploading") {
    return "Todavía estoy leyendo este archivo. Dejá abierta la pantalla de apuntes o exámenes hasta que termine.";
  }
  if (status === "pdf-ocr-empty") {
    return "Intenté OCR, pero no devolvió texto legible.";
  }
  if (status === "pdf-ocr-error") {
    return "El OCR configurado falló para este PDF.";
  }
  if (status === "pdf-text-error") {
    return "No pude interpretar ese PDF. Si es un escaneo, configurá OCR.";
  }
  return undefined;
}
