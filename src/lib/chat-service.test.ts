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
