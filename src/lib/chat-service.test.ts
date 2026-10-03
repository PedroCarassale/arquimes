import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGroundingSnippet,
  buildPrompt,
  isBroadLearningRequest,
} from "./chat-service.ts";
import type { StudyContext } from "./study-chat.ts";

const BROAD_ASK =
  "Necesito aprender todo el apunte. Mapeá los temas y empecemos por el primero.";

function multiChunkFixture(): string {
  return Array.from({ length: 24 }, (_, index) => {
    const marker =
      index === 0
        ? "MARCADOR-TEMPRANO-ARQUIMES"
        : index === 23
          ? "MARCADOR-TARDÍO-ARQUIMES"
          : `MARCADOR-INTERMEDIO-${index}`;
    return [
      `${index + 1}. Tema distintivo ${index + 1}`,
      `${marker}. ${"Desarrollo conceptual y ejemplo aplicado. ".repeat(32)}`,
    ].join("\n");
  }).join("\n\n");
}

test("detecta pedidos de aprendizaje del apunte completo", () => {
  assert.equal(isBroadLearningRequest(BROAD_ASK), true);
  assert.equal(isBroadLearningRequest("Explicame el apunte entero"), true);
  assert.equal(isBroadLearningRequest("Recorramos el material de punta a punta"), true);
  assert.equal(isBroadLearningRequest("Mapeá los temas del apunte"), true);
  assert.equal(isBroadLearningRequest("Haceme un resumen completo del apunte"), true);
  assert.equal(isBroadLearningRequest("Explicame todo"), true);
  assert.equal(isBroadLearningRequest("Explicame la definición de límite"), false);
  assert.equal(isBroadLearningRequest("Me cuesta, sobre todo, derivadas"), false);
});

test("un pedido amplio conserva marcadores tempranos y tardíos del PDF", () => {
  const fixture = multiChunkFixture();
  assert.ok(fixture.length > 20_000);

  const snippet = buildGroundingSnippet(fixture, BROAD_ASK);

  assert.match(snippet, /MARCADOR-TEMPRANO-ARQUIMES/);
  assert.match(snippet, /MARCADOR-TARDÍO-ARQUIMES/);
  assert.doesNotMatch(snippet, /\[fragmento \d+ de \d+\]/);
});

test("el prompt amplio incluye el índice completo y ambos extremos", () => {
  const context: StudyContext = {
    materiaId: "materia-fixture",
    materiaName: "Análisis",
    sources: [
      {
        name: "apunte-multichunk.pdf",
        kind: "apunte",
        text: multiChunkFixture(),
      },
    ],
    exams: [],
  };

  const prompt = buildPrompt({
    context,
    history: [],
    userMessage: BROAD_ASK,
  });
  const system = prompt[0].content;

  assert.match(system, /ÍNDICE DEL MATERIAL \(completo\)/);
  assert.match(system, /TEXTO EXTRAÍDO COMPLETO/);
  assert.match(system, /MARCADOR-TEMPRANO-ARQUIMES/);
  assert.match(system, /MARCADOR-TARDÍO-ARQUIMES/);
  assert.match(system, /Solo afirmes que la cobertura es parcial.*EXTRACCIÓN FALLIDA/);
});

test("una pregunta puntual recibe el material completo cuando entra en el presupuesto", () => {
  const pages = Array.from(
    { length: 60 },
    (_, index) =>
      `[Página ${index + 1}]\nArtículo ${index + 1}. ${"Texto legal transcripto. ".repeat(80)}MARCA-PAGINA-${index + 1}.`
  ).join("\n\n");
  assert.ok(pages.length > 100_000);

  const context: StudyContext = {
    materiaId: "materia-legislacion",
    materiaName: "Legislación",
    sources: [
      {
        name: "Legislación 700-A.pdf",
        kind: "apunte",
        text: pages,
        lectura: { estado: "lista", paginasLeidas: 60, paginasTotales: 60 },
      },
    ],
    exams: [],
  };

  const first = buildPrompt({ context, history: [], userMessage: "¿Qué dice el artículo 3?" });
  const second = buildPrompt({ context, history: [], userMessage: "Explicame la sociedad anónima" });
  const system = first[0].content;

  assert.match(system, /MATERIAL COMPLETO/);
  assert.match(system, /MARCA-PAGINA-1\./);
  assert.match(system, /MARCA-PAGINA-60\./);
  assert.match(system, /LECTURA COMPLETA: 60 páginas/);
  assert.equal(system, second[0].content);
});

test("una fuente a medio leer queda marcada como lectura en curso", () => {
  const context: StudyContext = {
    materiaId: "m",
    materiaName: "Legislación",
    sources: [
      {
        name: "escaneado.pdf",
        kind: "apunte",
        text: "[Página 1]\nPrimer artículo.",
        lectura: { estado: "leyendo", paginasLeidas: 4, paginasTotales: 124 },
      },
    ],
    exams: [],
  };
  const system = buildPrompt({ context, history: [], userMessage: "Hola" })[0].content;
  assert.match(system, /LECTURA EN CURSO: 4 de 124 páginas/);
});

test("en un apunte grande, una pregunta por página recupera esa página", () => {
  const pages = Array.from(
    { length: 124 },
    (_, index) =>
      `[Página ${index + 1}]\nArtículo ${index + 1}. ${"Texto legal transcripto. ".repeat(140)}MARCA-PAGINA-${index + 1}.`
  ).join("\n\n");
  assert.ok(pages.length > 400_000);

  const context: StudyContext = {
    materiaId: "m",
    materiaName: "Legislación",
    sources: [{ name: "Legislación 700-A.pdf", kind: "apunte", text: pages }],
    exams: [],
  };
  const system = buildPrompt({
    context,
    history: [],
    userMessage: "¿Qué dice la página 100 del apunte?",
  })[0].content;

  assert.doesNotMatch(system, /MATERIAL COMPLETO:/);
  assert.match(system, /MARCA-PAGINA-100\./);
  assert.ok(system.length < 150_000);
});
