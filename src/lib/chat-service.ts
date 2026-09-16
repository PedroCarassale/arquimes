import { generateWithProvider, type ProviderMessage } from "./ai-providers";
import type { ChatMessage } from "./types";
import type { StudyContext } from "./study-chat";

const SUGGESTED_CHIPS = [
  "Haceme un resumen completo de lo que entra.",
  "Armame un plan de estudio para llegar al examen.",
  "Explícame un tema puntual paso a paso.",
  "Tomame un parcial simulado con corrección.",
] as const;

export function getSuggestedChips() {
  return [...SUGGESTED_CHIPS];
}

export function buildPrompt(input: {
  context: StudyContext;
  history: ChatMessage[];
  userMessage: string;
}): ProviderMessage[] {
  const contextBlock = buildContextBlock(input.context);

  const system = [
    "Sos Arquimes, un tutor de estudio universitario en español rioplatense.",
    "Objetivo: ayudar a responder '¿Qué tan preparado estoy para rendir este examen?' sin inventar datos.",
    "Reglas:",
    "- Respondé solo con base en el CONTEXTO DE MATERIA.",
    "- Si falta material para responder, decilo de forma directa y sugerí qué cargar.",
    "- Nunca inventes porcentaje de preparación; eso lo define la práctica.",
    "- Podés proponer simulaciones de parcial y planes de estudio concretos.",
    "- Mantené tono claro, nocturno de estudio, sin marketing.",
    "- Siempre devolvé JSON con este formato exacto:",
    '{"answer":"texto en markdown corto","citations":["fuente 1","fuente 2"]}',
    "- citations debe listar nombres de fuentes usadas de forma literal; si no usaste, []",
    "",
    "CONTEXTO DE MATERIA",
    contextBlock,
  ].join("\n");

  const history = input.history.slice(-10).map((msg) => ({
    role: msg.role,
    content: msg.content,
  })) as ProviderMessage[];

  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: input.userMessage },
  ];
}

export async function runGroundedChat(input: {
  context: StudyContext;
  history: ChatMessage[];
  userMessage: string;
}): Promise<{ answer: string; citations: string[] }> {
  const prompt = buildPrompt(input);
  const response = await generateWithProvider(prompt);
  const parsed = parseResponse(response.text);
  if (!parsed) {
    return {
      answer: response.text.trim(),
      citations: [],
    };
  }
  return parsed;
}

function buildContextBlock(ctx: StudyContext): string {
  const sourceChunks = ctx.sources
    .map((source) => {
      const text = source.text?.trim();
      return [
        `FUENTE: ${source.name}`,
        `TIPO: ${source.kind}`,
        text
          ? `CONTENIDO: ${buildGroundingSnippet(text)}`
          : "CONTENIDO: [sin texto legible]",
      ].join("\n");
    })
    .join("\n\n");

  const examChunks = ctx.exams
    .map((exam) => {
      return [
        `EXAMEN: ${exam.name}`,
        `TIPO: ${exam.typeLabel}`,
        exam.date ? `FECHA: ${exam.date}` : "",
        exam.objective ? `OBJETIVO: ${exam.objective}` : "",
        exam.temas.length ? `TEMAS: ${exam.temas.join(", ")}` : "TEMAS: [sin temas]",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    `MATERIA: ${ctx.materiaName}`,
    sourceChunks || "SIN FUENTES",
    examChunks || "SIN EXAMENES CARGADOS",
  ].join("\n\n");
}

function buildGroundingSnippet(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (normalized.length <= 4200) return normalized;
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length <= 3) return clip(normalized, 4200);
  const head = paragraphs.slice(0, 4).join("\n\n");
  const middleIndex = Math.floor(paragraphs.length / 2);
  const middle = paragraphs.slice(Math.max(0, middleIndex - 1), middleIndex + 1).join("\n\n");
  const tail = paragraphs.slice(-3).join("\n\n");
  return clip(
    `${head}\n\n[...contenido intermedio recortado...]\n\n${middle}\n\n[...tramo final...]\n\n${tail}`,
    4200
  );
}

function parseResponse(text: string): { answer: string; citations: string[] } | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(trimmed.slice(start, end + 1)) as {
      answer?: string;
      citations?: unknown;
    };
    const answer = typeof obj.answer === "string" ? obj.answer.trim() : "";
    if (!answer) return null;
    const citations = Array.isArray(obj.citations)
      ? obj.citations.filter((value): value is string => typeof value === "string")
      : [];
    return { answer, citations };
  } catch {
    return null;
  }
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}
