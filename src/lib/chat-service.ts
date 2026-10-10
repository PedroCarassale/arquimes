import { generateWithProvider, type ProviderMessage } from "./ai-providers.ts";
import { parseAssistantContent } from "./chat-message.ts";
import type { ChatMessage } from "./types";
import type { StudyContext, StudySource } from "./study-chat";
import { extractArtefactos, type ArtefactoBlock } from "./artefactos.ts";
import { procesarEdiciones, sinRegistros } from "./edicion-clase.ts";

export type ChatFocus = {
  kind: "nota" | "artefacto" | "material" | "examen";
  titulo: string;
  id: string;
  contenido: string | null;
};

const MAX_FOCUS_CHARS = 60_000;
const MAX_LATEST_ARTEFACTO_CHARS = 20_000;

const SUGGESTED_CHIPS = [
  "Necesito aprender todo el apunte. Mapeá los temas y empecemos por el primero.",
  "Armame una ruta de estudio progresiva para llegar al examen.",
  "Explicame un tema paso a paso, con fórmulas y un ejemplo.",
  "Tomame un parcial simulado con corrección.",
] as const;

const MAX_CONTEXT_CHARS = 100_000;
const MAX_SOURCE_CHARS = 70_000;
const MAX_BROAD_CONTEXT_CHARS = 150_000;
const CHUNK_TARGET = 1_100;
const MAX_SELECTED_CHUNKS = 36;
const FULL_MATERIAL_CHARS =
  Number(process.env.CHAT_FULL_MATERIAL_CHARS) || 160_000;

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
  focus?: ChatFocus | null;
}): ProviderMessage[] {
  const broadRequest = isBroadLearningRequest(input.userMessage);
  const contextBlock = buildContextBlock(
    input.context,
    input.userMessage,
    broadRequest
  );

  const system = [
    "Sos Arquimedes, un tutor universitario exigente, paciente y claro. Hablás en español rioplatense, con tono de estudio nocturno y sin marketing.",
    "Tu rol: sos el compañero de estudio del estudiante. Lo ayudás a organizar la cursada y le explicás usando su propio material (clases, apuntes y eventos del calendario), sin inventar contenido que no está.",
    "",
    "CONTRATO DE FUNDAMENTACIÓN",
    "- Enseñá únicamente desde el CONTEXTO DE MATERIA recuperado. No completes el programa con conocimiento externo ni inventes temas.",
    "- En pedidos amplios, el «ÍNDICE DEL MATERIAL (completo)» fue construido en el servidor recorriendo todo el texto extraído de cada fuente. Usalo para mapear el apunte y no inventes faltantes por números de fragmento.",
    "- Solo afirmes que la cobertura es parcial cuando una fuente esté marcada como «EXTRACCIÓN FALLIDA», «LECTURA EN CURSO» o «LECTURA PARCIAL». Un límite de recuperación o de contexto no significa que el PDF esté incompleto.",
    "- Si el contexto dice «MATERIAL COMPLETO», tenés delante todo el texto legible de cada fuente: respondé con seguridad sobre cualquier parte del material.",
    "- El texto puede traer marcas «[Página N]». Cuando cites una definición, artículo o ejercicio, mencioná la página (por ejemplo: «pág. 37»).",
    "- Preferí definiciones, notación, fórmulas y relaciones que estén presentes en el apunte. No atribuyas al apunte una fórmula que no aparece en el contexto.",
    "- Si falta material legible o no encontrás el tema, decilo de frente y sugerí qué fuente cargar.",
    "- Citá únicamente nombres exactos que aparezcan después de FUENTE. No inventes bibliografía.",
    "",
    "CHAT O PERGAMINO",
    "- El chat es para preguntas concretas con respuesta sencilla: una definición puntual, un dato, una fecha, una duda corta, «¿esto entra en el parcial?». Ahí respondé directo, en pocas líneas (máximo un párrafo corto o una lista breve).",
    "- Todo lo elaborado va en un PERGAMINO (artefacto), nunca en el chat: explicar un tema, enseñar paso a paso, resumir un capítulo o un apunte, guías, mapas de temas, cuadros comparativos, resoluciones largas, simulacros y exámenes de práctica.",
    "- Ante la duda (si la respuesta necesitaría títulos, más de un párrafo o varios pasos), creá el pergamino.",
    "- Dentro del pergamino enseñá bien: ubicá el tema, desarrollá definiciones y fórmulas del material, resolvé un ejemplo concreto cuando el material lo permita y cerrá con «Idea clave» y 2 o 3 preguntas de comprensión.",
    "- Ante «explicame todo el apunte» o equivalente, el pergamino arranca con un mapa honesto de los temas visibles en las fuentes y un orden propuesto, y desarrolla el primer bloque.",
    "- Diferenciá símbolos parecidos y explicitá unidades o supuestos cuando figuren en el material.",
    "",
    "FORMATO",
    "- Respondé primero con el contenido pedagógico en Markdown, sin envolverlo en JSON ni en un bloque de código.",
    "- Para matemática inline usá exclusivamente \\( ... \\) y para bloques usá $$ ... $$. No uses delimitadores $...$.",
    "- Escribí LaTeX compatible con KaTeX y conservá las barras invertidas de los comandos TeX. Por ejemplo: \\Delta, \\frac{a}{b}, \\epsilon y \\alpha.",
    "- Al final agregá una única línea de metadatos con este formato exacto:",
    '<!-- ARQUIMES_CITATIONS: ["nombre exacto de fuente"] -->',
    "- La lista debe contener cada fuente realmente usada. Si no usaste ninguna, escribí []. La línea de metadatos no forma parte de la respuesta visible.",
    "",
    "",
    ARTEFACTOS_CONTRACT,
    "",
    buildEdicionClaseContract(input.focus),
    "",
    buildArtefactosBlock(input.context, input.focus),
    buildFocusBlock(input.focus),
    "CONTEXTO DE MATERIA",
    contextBlock,
  ].join("\n");

  const history = input.history.slice(-10).map((msg) => ({
    role: msg.role,
    content: msg.role === "assistant" ? sinRegistros(msg.content) : msg.content,
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
  focus?: ChatFocus | null;
}): Promise<{
  answer: string;
  citations: string[];
  artefactos: ArtefactoBlock[];
  withArtefactoIds: (ids: string[]) => string;
}> {
  const prompt = buildPrompt(input);
  const response = await generateWithProvider(prompt);
  const parsed = parseAssistantContent(response.text);
  const knownSources = new Set(input.context.sources.map((source) => source.name));
  const clase =
    input.focus?.kind === "nota" ? { id: input.focus.id, titulo: input.focus.titulo } : null;
  const answer = procesarEdiciones(parsed ? parsed.answer : response.text.trim(), clase).text;
  const extracted = extractArtefactos(answer);
  const knownArtefactos = new Set((input.context.artefactos || []).map((a) => a.id));
  return {
    answer,
    citations: parsed
      ? [...new Set(parsed.citations.filter((name) => knownSources.has(name)))]
      : [],
    artefactos: extracted.blocks.map((block) => ({
      ...block,
      id: block.id && knownArtefactos.has(block.id) ? block.id : undefined,
    })),
    withArtefactoIds: extracted.replace,
  };
}

const ARTEFACTOS_CONTRACT = [
  "PERGAMINOS (artefactos: documentos que se abren en una pestaña al lado del chat y quedan guardados en Apuntes)",
  "- En la interfaz se llaman «pergaminos». Cuando le hables al estudiante de ellos, decí «pergamino», nunca «artefacto».",
  "- Escribí como pergamino toda explicación de un tema, resumen, guía, cuadro comparativo, resolución larga, simulacro, parcial de práctica o cuestionario, en vez de pegarlo en el chat.",
  '- Formato: <artefacto tipo="examen" titulo="Título corto">…markdown…</artefacto>. Usá tipo="documento" para todo lo que no sea un examen.',
  "- Título corto y específico (por ejemplo «Teorema de Bolzano» o «Resumen · Capítulo 3»), sin prefijos como «Apunte:».",
  "- Fuera del pergamino escribí solo una frase: qué armaste. No repitas el contenido en el chat.",
  '- Para modificar un artefacto existente usá su id: <artefacto id="ID" tipo="..." titulo="...">…contenido COMPLETO nuevo…</artefacto>. Se guarda como versión nueva.',
  "- Examen interactivo (tipo=\"examen\"): empezá con «# Título» y una línea de instrucciones. Cada pregunta es un encabezado «## N. enunciado» (N = 1, 2, 3…).",
  "  · Debajo, una línea «Tema: nombre del tema» usando, si existen, los nombres exactos de los TEMAS del evento. Es solo una etiqueta informativa.",
  "  · Opción múltiple: opciones como «- [ ] texto» y marcá la correcta con «- [x] texto». Exactamente una correcta. Después «> Explicación: …».",
  "  · Desarrollo: sin opciones; después del enunciado poné «> Respuesta: …» con la resolución modelo completa.",
  "  · Mezclá opción múltiple y desarrollo salvo que pidan otra cosa. Basá las preguntas en el material de la materia.",
  "- Dentro del artefacto podés usar Markdown, tablas y LaTeX con las mismas reglas de FORMATO.",
].join("\n");

function buildEdicionClaseContract(focus?: ChatFocus | null): string {
  if (focus?.kind !== "nota") {
    return [
      "ESCRIBIR EN LAS NOTAS DE UNA CLASE",
      "- Ahora no hay ninguna clase abierta, así que no podés escribir en sus notas: nunca generes bloques <edicion-clase>.",
      "- Si te pide agregar algo a las notas de una clase, respondé brevemente lo que pide y decile que abra esa clase y te lo vuelva a pedir.",
    ].join("\n");
  }
  return [
    `EDITAR LA CLASE ABIERTA («${focus.titulo}»)`,
    "- Si el estudiante te pide agregar, anotar, sumar, completar o corregir algo EN SUS NOTAS de esta clase (por ejemplo «agregame en las notas la definición de continuidad»), escribí el fragmento dentro de un bloque de edición. La app lo inserta en el editor de la clase; vos no guardás nada.",
    '- Formato: <edicion-clase modo="agregar" donde="final">…markdown…</edicion-clase>',
    '- donde="final" lo agrega al final de la clase (usalo por defecto). donde="cursor" lo inserta donde el estudiante tiene el cursor (solo si dice «acá», «donde estoy» o similar). donde="despues:Encabezado" lo agrega al final de la sección con ese encabezado.',
    '- En despues: y seccion: copiá el texto EXACTO de un encabezado que exista en la clase, sin los # (por ejemplo, para «## Límites laterales» escribí donde="despues:Límites laterales"). No lo resumas, no lo traduzcas ni inventes uno parecido: si no coincide exacto, la app lo agrega al final.',
    '- Usá siempre modo="agregar", salvo que el estudiante pida explícitamente reescribir, reemplazar o corregir una sección que ya existe. Solo ahí usá modo="reemplazar" donde="seccion:Encabezado": el fragmento reemplaza todo lo que hay debajo de ese encabezado hasta el siguiente del mismo nivel o superior. El encabezado se conserva: no lo repitas.',
    '- Nunca uses modo="reemplazar" sobre el título general de la clase ni para reescribir la clase entera: la app no reemplaza una sección que ocupe casi toda la clase y en ese caso agrega el fragmento al final.',
    "- El fragmento es Markdown listo para sus apuntes: breve y concreto (una definición, una fórmula, una lista corta, un ejemplo), sin saludos ni frases como «Aquí está». Podés abrirlo con un subtítulo «### …» si ayuda. No repitas lo que ya está en la clase.",
    "- Dentro del bloque la matemática sigue las reglas de FORMATO (KaTeX).",
    "- Mismo contrato de fundamentación: basalo en el material de la materia y en la propia clase. Si el material no lo cubre, decilo y no agregues nada inventado.",
    "- Fuera del bloque escribí una sola frase corta, por ejemplo «Listo, lo agregué al final de la clase.». No repitas el fragmento en el chat.",
    "- Usá el bloque solo cuando te pide cambiar sus notas, nunca dentro de un pergamino. Para el resto de las preguntas respondé como siempre.",
  ].join("\n");
}

function buildArtefactosBlock(ctx: StudyContext, focus?: ChatFocus | null): string {
  const artefactos = ctx.artefactos || [];
  if (artefactos.length === 0) return "ARTEFACTOS EXISTENTES: ninguno todavía.\n";
  const list = artefactos
    .slice(0, 30)
    .map((a) => `- id="${a.id}" tipo="${a.tipo}" titulo="${a.titulo}" (versión ${a.version})`)
    .join("\n");
  const latest = artefactos[0];
  const latestBlock =
    latest && !(focus?.kind === "artefacto" && focus.id === latest.id)
      ? `\nCONTENIDO DEL ÚLTIMO ARTEFACTO (id="${latest.id}"):\n${clipText(latest.contenido, MAX_LATEST_ARTEFACTO_CHARS)}`
      : "";
  return `ARTEFACTOS EXISTENTES EN LA MATERIA:\n${list}${latestBlock}\n`;
}

function buildFocusBlock(focus?: ChatFocus | null): string {
  if (!focus) return "";
  const label =
    focus.kind === "nota"
      ? "la clase del estudiante (sus notas en Markdown, tal como están ahora en el editor)"
      : focus.kind === "artefacto"
        ? `el artefacto id="${focus.id}"`
        : focus.kind === "examen"
          ? "un evento del calendario (examen, entrega u otro)"
          : "un archivo de material";
  const body = focus.contenido?.trim()
    ? clipText(focus.contenido, MAX_FOCUS_CHARS)
    : "[sin texto legible]";
  return [
    `LO QUE EL ESTUDIANTE TIENE ABIERTO AHORA: ${label} — «${focus.titulo}».`,
    "Si pregunta por «esto», «este examen», «la nota» o similar, se refiere a este documento. Si pide cambios sobre un artefacto abierto, devolvé una versión nueva con su id.",
    body,
    "",
  ].join("\n");
}

function clipText(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n[…recortado…]`;
}

function readingStatusLine(source: StudySource): string {
  const lectura = source.lectura;
  if (!lectura) return "";
  if (lectura.estado === "leyendo" || lectura.estado === "subiendo") {
    return `LECTURA EN CURSO: ${lectura.paginasLeidas} de ${lectura.paginasTotales} páginas transcriptas; el resto todavía no está disponible.`;
  }
  if (lectura.estado === "parcial") {
    return `LECTURA PARCIAL: se pudieron leer ${lectura.paginasLeidas} de ${lectura.paginasTotales} páginas.`;
  }
  if (lectura.estado === "lista" && lectura.paginasTotales > 1) {
    return `LECTURA COMPLETA: ${lectura.paginasTotales} páginas.`;
  }
  return "";
}

function fitsFullMaterial(ctx: StudyContext): boolean {
  const total = ctx.sources.reduce(
    (sum, source) => sum + normalizeSourceText(source.text || "").length,
    0
  );
  return total > 0 && total <= FULL_MATERIAL_CHARS;
}

function buildExamChunks(ctx: StudyContext): string {
  return ctx.exams
    .map((exam) =>
      [
        `EVENTO: ${exam.name}`,
        `TIPO: ${exam.typeLabel}`,
        exam.date ? `FECHA: ${exam.date}` : "FECHA: [sin fecha]",
        exam.hora ? `HORA: ${exam.hora}` : "",
        exam.objective ? `DE QUÉ TRATA: ${exam.objective}` : "",
        exam.temas.length ? `TEMAS: ${exam.temas.join(", ")}` : "TEMAS: [sin temas]",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function buildFullMaterialBlock(ctx: StudyContext): string {
  const sources = ctx.sources
    .map((source) => {
      const text = source.text ? normalizeSourceText(source.text) : "";
      return [
        `FUENTE: ${source.name}`,
        `TIPO: ${source.kind}`,
        readingStatusLine(source),
        text
          ? `TEXTO EXTRAÍDO COMPLETO:\n${text}`
          : `EXTRACCIÓN FALLIDA: [sin texto legible]${source.unreadableHint ? ` ${source.unreadableHint}` : ""}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    `MATERIA: ${ctx.materiaName}`,
    "MATERIAL COMPLETO: cada fuente legible está incluida de principio a fin, sin recortes.",
    buildMaterialOutline(ctx),
    sources || "SIN FUENTES",
    buildExamChunks(ctx) || "SIN EVENTOS EN EL CALENDARIO",
  ].join("\n\n");
}

function buildContextBlock(
  ctx: StudyContext,
  query: string,
  broadRequest: boolean
): string {
  if (fitsFullMaterial(ctx)) return buildFullMaterialBlock(ctx);
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
        readingStatusLine(source),
        snippet
          ? broadRequest
            ? `TEXTO EXTRAÍDO${sourceFullyIncluded ? " COMPLETO" : " PARA ENSEÑANZA"}:\n${snippet}`
            : `FRAGMENTOS RECUPERADOS:\n${snippet}`
          : text
            ? "TEXTO EXTRAÍDO PARA ENSEÑANZA: [detalle cubierto por el índice completo]"
            : "EXTRACCIÓN FALLIDA: [sin texto legible]",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const examChunks = buildExamChunks(ctx);

  return [
    `MATERIA: ${ctx.materiaName}`,
    broadRequest ? buildMaterialOutline(ctx) : "",
    sourceChunks || "SIN FUENTES",
    examChunks || "SIN EVENTOS EN EL CALENDARIO",
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
    Math.ceil(CHUNK_TARGET * 1.6),
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

  const pages = requestedPages(query);
  const pageChunks = pages.size ? chunksForPages(chunks, pages) : [];
  if (pageChunks.length >= MAX_SELECTED_CHUNKS) {
    return pageChunks.slice(0, MAX_SELECTED_CHUNKS);
  }

  const terms = retrievalTerms(query).filter(
    (term) => !(pages.size && (/^pag/.test(term) || pages.has(Number(term))))
  );
  if (terms.length === 0) {
    return pageChunks.length ? pageChunks : selectBroadCoverage(chunks);
  }

  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      score: relevanceScore(chunk.text, terms),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selectedIndexes = new Set<number>(pageChunks.map((chunk) => chunk.index));

  for (const chunk of ranked.slice(0, Math.ceil(MAX_SELECTED_CHUNKS / 2))) {
    if (selectedIndexes.size >= MAX_SELECTED_CHUNKS) break;
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

const MAX_REQUESTED_PAGES = 8;

function requestedPages(query: string): Set<number> {
  const pages = new Set<number>();
  const pattern =
    /\bpag(?:ina)?s?\.?(?:\s+(?:de|del|la|el|apunte|material|pdf|libro))*[\s(]*(\d{1,4})(?:\s*(?:a|al|-|–|hasta|y)\s*(\d{1,4}))?/g;
  for (const match of fold(query).matchAll(pattern)) {
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    for (let page = Math.min(start, end); page <= Math.max(start, end); page += 1) {
      if (pages.size >= MAX_REQUESTED_PAGES) return pages;
      pages.add(page);
    }
  }
  return pages;
}

function chunksForPages(chunks: RetrievalChunk[], pages: Set<number>): RetrievalChunk[] {
  const selected: RetrievalChunk[] = [];
  let currentPage = 0;
  for (const chunk of chunks) {
    const touched = new Set<number>(currentPage ? [currentPage] : []);
    for (const marker of chunk.text.matchAll(/\[Página (\d+)\]/g)) {
      currentPage = Number(marker[1]);
      touched.add(currentPage);
    }
    if ([...touched].some((page) => pages.has(page))) selected.push(chunk);
  }
  return selected;
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
