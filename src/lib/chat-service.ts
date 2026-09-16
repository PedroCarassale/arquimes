import { generateWithProvider, type ProviderMessage } from "./ai-providers.ts";
import { parseAssistantContent } from "./chat-message.ts";
import type { ChatMessage } from "./types";
import type { StudyContext } from "./study-chat";

const SUGGESTED_CHIPS = [
  "Necesito aprender todo el apunte. Mapeá los temas y empecemos por el primero.",
  "Armame una ruta de estudio progresiva para llegar al examen.",
  "Explicame un tema paso a paso, con fórmulas y un ejemplo.",
  "Tomame un parcial simulado con corrección.",
] as const;

const MAX_CONTEXT_CHARS = 48_000;
const MAX_SOURCE_CHARS = 20_000;
const MAX_BROAD_CONTEXT_CHARS = 150_000;
const CHUNK_TARGET = 1_100;
const MAX_SELECTED_CHUNKS = 12;

const RETRIEVAL_STOPWORDS = new Set([
  "apunte",
  "apuntes",
  "aprender",
  "completo",
  "explica",
  "explicame",
  "explicá",
  "necesito",
  "quiero",
  "resumen",
  "tema",
  "temas",
  "todo",
  "todos",
]);

export function getSuggestedChips() {
  return [...SUGGESTED_CHIPS];
}

export function buildPrompt(input: {
  context: StudyContext;
  history: ChatMessage[];
  userMessage: string;
}): ProviderMessage[] {
  const broadRequest = isBroadLearningRequest(input.userMessage);
  const contextBlock = buildContextBlock(
    input.context,
    input.userMessage,
    broadRequest
  );

  const system = [
    "Sos Arquimes, un tutor universitario exigente, paciente y claro. Hablás en español rioplatense, con tono de estudio nocturno y sin marketing.",
    "Norte del producto: ayudar a responder «¿Qué tan preparado estoy para rendir este examen?» sin inventar preparación. Solo la práctica calcula preparación o porcentajes.",
    "",
    "CONTRATO DE FUNDAMENTACIÓN",
    "- Enseñá únicamente desde el CONTEXTO DE MATERIA recuperado. No completes el programa con conocimiento externo ni inventes temas.",
    "- En pedidos amplios, el «ÍNDICE DEL MATERIAL (completo)» fue construido en el servidor recorriendo todo el texto extraído de cada fuente. Usalo para mapear el apunte y no inventes faltantes por números de fragmento.",
    "- Solo afirmes que la cobertura es parcial cuando una fuente esté marcada como «EXTRACCIÓN FALLIDA». Un límite de recuperación o de contexto no significa que el PDF esté incompleto.",
    "- Preferí definiciones, notación, fórmulas y relaciones que estén presentes en el apunte. No atribuyas al apunte una fórmula que no aparece en el contexto.",
    "- Si falta material legible o no encontrás el tema, decilo de frente y sugerí qué fuente cargar.",
    "- Citá únicamente nombres exactos que aparezcan después de FUENTE. No inventes bibliografía.",
    "",
    "MODO TUTOR",
    "- Ante «necesito aprender X», explicá progresivamente: ubicá el tema, enseñá un bloque coherente, mostrale para qué sirve, desarrollá definiciones/fórmulas y resolvé un ejemplo concreto cuando el material lo permita.",
    "- Ante «explicame todo el apunte» o equivalente: (1) armá un mapa honesto de los temas visibles en las fuentes, (2) proponé un orden, (3) enseñá SOLO el primer bloque en esa respuesta. No tires una pared interminable de resúmenes.",
    "- Diferenciá símbolos parecidos y explicitá unidades o supuestos cuando figuren en el material.",
    "- Usá títulos breves, listas y una conclusión tipo «Idea clave» cuando ayuden. Una respuesta docente puede ser extensa; priorizá profundidad sobre brevedad, sin repetir.",
    "- Cerrá cada turno de enseñanza con 2 o 3 preguntas cortas de comprensión. Si el usuario solo organiza el estudio, cerrá preguntando qué tema quiere abrir primero.",
    "- No avances al siguiente bloque hasta que el estudiante responda el chequeo, salvo que lo pida explícitamente.",
    "",
    "FORMATO",
    "- Respondé primero con el contenido pedagógico en Markdown, sin envolverlo en JSON ni en un bloque de código.",
    "- Para matemática inline usá exclusivamente \\( ... \\) y para bloques usá $$ ... $$. No uses delimitadores $...$.",
    "- Escribí LaTeX compatible con KaTeX y conservá las barras invertidas de los comandos TeX. Por ejemplo: \\Delta, \\frac{a}{b}, \\epsilon y \\alpha.",
    "- Al final agregá una única línea de metadatos con este formato exacto:",
    '<!-- ARQUIMES_CITATIONS: ["nombre exacto de fuente"] -->',
    "- La lista debe contener cada fuente realmente usada. Si no usaste ninguna, escribí []. La línea de metadatos no forma parte de la respuesta visible.",
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
  const parsed = parseAssistantContent(response.text);
  if (!parsed) {
    return {
      answer: response.text.trim(),
      citations: [],
    };
  }
  const knownSources = new Set(input.context.sources.map((source) => source.name));
  return {
    answer: parsed.answer,
    citations: [...new Set(parsed.citations.filter((name) => knownSources.has(name)))],
  };
}

function buildContextBlock(
  ctx: StudyContext,
  query: string,
  broadRequest: boolean
): string {
  let remaining = broadRequest ? MAX_BROAD_CONTEXT_CHARS : MAX_CONTEXT_CHARS;
  const readableSources = ctx.sources.filter((source) => source.text?.trim());
  const readableChars = readableSources.reduce(
    (total, source) => total + normalizeSourceText(source.text || "").length,
    0
  );
  const sourceChunks = ctx.sources
    .map((source) => {
      const text = source.text ? normalizeSourceText(source.text) : "";
      const sourceBudget = broadRequest
        ? broadSourceBudget(text.length, readableChars, remaining)
        : Math.min(MAX_SOURCE_CHARS, remaining);
      const snippet = text && remaining > 0
        ? buildGroundingSnippet(text, query, sourceBudget)
        : "";
      const sourceFullyIncluded = Boolean(text) && text.length <= sourceBudget;
      remaining = Math.max(0, remaining - snippet.length);
      return [
        `FUENTE: ${source.name}`,
        `TIPO: ${source.kind}`,
        snippet
          ? broadRequest
            ? `TEXTO EXTRAÍDO${sourceFullyIncluded ? " COMPLETO" : " PARA ENSEÑANZA"}:\n${snippet}`
            : `FRAGMENTOS RECUPERADOS:\n${snippet}`
          : text
            ? "TEXTO EXTRAÍDO PARA ENSEÑANZA: [detalle cubierto por el índice completo]"
            : "EXTRACCIÓN FALLIDA: [sin texto legible]",
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
    broadRequest ? buildMaterialOutline(ctx) : "",
    sourceChunks || "SIN FUENTES",
    examChunks || "SIN EXAMENES CARGADOS",
  ].filter(Boolean).join("\n\n");
}

export function buildGroundingSnippet(
  text: string,
  query: string,
  maxChars = isBroadLearningRequest(query)
    ? MAX_BROAD_CONTEXT_CHARS
    : MAX_SOURCE_CHARS
): string {
  const normalized = normalizeSourceText(text);
  if (normalized.length <= maxChars) return normalized;
  if (isBroadLearningRequest(query)) return clip(normalized, maxChars);

  const chunks = chunkForRetrieval(normalized);
  const selected = selectChunks(chunks, query);
  const perChunkBudget = Math.max(
    400,
    Math.floor((maxChars - selected.length * 80) / selected.length)
  );
  const rendered = selected
    .sort((a, b) => a.index - b.index)
    .map(
      ({ index, text: chunk }) =>
        `[fragmento ${index + 1} de ${chunks.length}]\n${clip(chunk, perChunkBudget)}`
    )
    .join("\n\n");

  return clip(rendered, maxChars);
}

type RetrievalChunk = { index: number; text: string };

function chunkForRetrieval(text: string): RetrievalChunk[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const units = paragraphs.length > 1 ? paragraphs : text.split(/\n+/).filter(Boolean);
  const chunks: RetrievalChunk[] = [];
  let current = "";

  const flush = () => {
    if (!current.trim()) return;
    chunks.push({ index: chunks.length, text: current.trim() });
    current = "";
  };

  for (const unit of units) {
    if (unit.length > CHUNK_TARGET * 1.6) {
      flush();
      const sentences = unit.split(/(?<=[.!?;:])\s+/);
      for (const sentence of sentences) {
        if (sentence.length > CHUNK_TARGET * 1.6) {
          for (let start = 0; start < sentence.length; start += CHUNK_TARGET) {
            chunks.push({
              index: chunks.length,
              text: sentence.slice(start, start + CHUNK_TARGET).trim(),
            });
          }
        } else if (`${current} ${sentence}`.trim().length > CHUNK_TARGET) {
          flush();
          current = sentence;
        } else {
          current = `${current} ${sentence}`.trim();
        }
      }
      flush();
      continue;
    }

    if (`${current}\n\n${unit}`.trim().length > CHUNK_TARGET) flush();
    current = current ? `${current}\n\n${unit}` : unit;
  }
  flush();

  return chunks.length ? chunks : [{ index: 0, text: clip(text, CHUNK_TARGET) }];
}

function selectChunks(chunks: RetrievalChunk[], query: string): RetrievalChunk[] {
  if (chunks.length <= MAX_SELECTED_CHUNKS) return chunks;
  if (isBroadLearningRequest(query)) {
    return selectBroadCoverage(chunks);
  }

  const terms = retrievalTerms(query);
  if (terms.length === 0) return selectBroadCoverage(chunks);

  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      score: relevanceScore(chunk.text, terms),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selectedIndexes = new Set<number>();

  for (const chunk of ranked.slice(0, 7)) {
    selectedIndexes.add(chunk.index);
    if (chunk.score > 0) {
      selectedIndexes.add(Math.max(0, chunk.index - 1));
      selectedIndexes.add(Math.min(chunks.length - 1, chunk.index + 1));
    }
    if (selectedIndexes.size >= MAX_SELECTED_CHUNKS) break;
  }

  return [...selectedIndexes]
    .slice(0, MAX_SELECTED_CHUNKS)
    .map((index) => chunks[index]);
}

function selectBroadCoverage(chunks: RetrievalChunk[]): RetrievalChunk[] {
  const selected = new Set<number>([0, chunks.length - 1]);
  const structural = chunks
    .map((chunk) => ({
      index: chunk.index,
      score: structuralScore(chunk.text),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 6);
  structural.forEach(({ index }) => selected.add(index));

  const slots = MAX_SELECTED_CHUNKS - selected.size;
  for (let i = 1; i <= slots; i += 1) {
    selected.add(Math.round((i * (chunks.length - 1)) / (slots + 1)));
  }

  return [...selected]
    .sort((a, b) => a - b)
    .slice(0, MAX_SELECTED_CHUNKS)
    .map((index) => chunks[index]);
}

function broadSourceBudget(
  sourceLength: number,
  totalReadableChars: number,
  remaining: number
): number {
  if (sourceLength <= 0 || totalReadableChars <= 0 || remaining <= 0) return 0;
  if (totalReadableChars <= MAX_BROAD_CONTEXT_CHARS) {
    return Math.min(sourceLength, remaining);
  }
  const proportional = Math.floor(
    (sourceLength / totalReadableChars) * MAX_BROAD_CONTEXT_CHARS
  );
  return Math.min(sourceLength, remaining, Math.max(CHUNK_TARGET, proportional));
}

function buildMaterialOutline(ctx: StudyContext): string {
  const sourceOutlines = ctx.sources.map((source) => {
    const text = source.text ? normalizeSourceText(source.text) : "";
    if (!text) {
      return [`FUENTE: ${source.name}`, "- [extracción fallida]"].join("\n");
    }

    const chunks = chunkForOutline(text);
    const entries = chunks.map((chunk, index) => {
      const label = outlineLabel(chunk);
      return `- Sección ${index + 1}/${chunks.length}: ${label}`;
    });
    return [`FUENTE: ${source.name}`, ...entries].join("\n");
  });

  return [
    "ÍNDICE DEL MATERIAL (completo)",
    "Generado recorriendo de principio a fin todo el texto extraído.",
    ...sourceOutlines,
  ].join("\n");
}

function chunkForOutline(text: string): string[] {
  const target = 2_400;
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += target) {
    chunks.push(text.slice(start, start + target));
  }
  return chunks.length ? chunks : [text];
}

function outlineLabel(chunk: string): string {
  const lines = chunk
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const heading = lines.find(
    (line) =>
      line.length <= 120 &&
      (/^(?:\d+(?:\.\d+)*[.)-]?\s+|[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ,:;()/-]{4,})/.test(line) ||
        (!/[.!?]$/.test(line) && line.split(/\s+/).length <= 12))
  );
  const candidate = heading || lines[0] || "[sección sin texto]";
  return clip(candidate, 140);
}

function retrievalTerms(query: string): string[] {
  return [
    ...new Set(
      fold(query)
        .split(/[^a-z0-9α-ω]+/g)
        .filter((term) => term.length >= 3 && !RETRIEVAL_STOPWORDS.has(term))
    ),
  ];
}

function relevanceScore(text: string, terms: string[]): number {
  const folded = fold(text);
  const matched = terms.reduce(
    (score, term) => score + (folded.includes(term) ? 3 + Math.min(term.length, 8) / 4 : 0),
    0
  );
  return matched + structuralScore(text) * 0.15;
}

function structuralScore(text: string): number {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const headingLike = lines.filter(
    (line) => line.length <= 90 && !/[.!?]$/.test(line)
  ).length;
  const formulaLike = (text.match(/[=±∆Δεαβσρ∑√]|\\(?:frac|Delta|epsilon|alpha)/g) || [])
    .length;
  const definitionLike = (
    fold(text).match(/\b(definicion|se define|concepto|teorema|propiedad|clasificacion)\b/g) || []
  ).length;
  return headingLike * 2 + Math.min(formulaLike, 6) + definitionLike * 2;
}

export function isBroadLearningRequest(query: string): boolean {
  const folded = fold(query);
  return [
    /\b(?:todo|toda)(?:\s+(?:el|la))?\s+(?:apunte|material|contenido|temario|programa)\b/,
    /\btodos? los temas\b/,
    /\b(?:apunte|material|temario|programa)\s+(?:completo|completa|entero|entera)\b/,
    /\b(?:completo|completa|entero|entera)\s+(?:(?:de|del)\s+)?(?:apunte|material|contenido|temario|programa)\b/,
    /\b(?:mapea|mapear|mapeo|organiza|organizar)\b.*\b(?:tema|temas|apunte|material|contenido)\b/,
    /\b(?:mapa|indice|programa|ruta de estudio)\b/,
    /\b(?:desde cero|de principio a fin|de punta a punta)\b/,
    /\b(?:aprender|estudiar|recorrer|explica|explicame)\s+(?:todo\s+)?(?:el\s+)?(?:apunte|material|temario)\b/,
    /\b(?:explica|explicame|ensena|ensename)\s+todo\b/,
  ].some((pattern) => pattern.test(folded));
}

function normalizeSourceText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}
