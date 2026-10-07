import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractArtefactos,
  normalizeTemaName,
  parseExamen,
  splitArtefactoMarkers,
} from "./artefactos.ts";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

test("extracts an artefacto block and replaces it with a marker", () => {
  const text = [
    "Te armé un simulacro.",
    '<artefacto tipo="examen" titulo="Simulacro 1">',
    "# Simulacro 1",
    "## 1. ¿Cuánto es 2+2?",
    "- [ ] 3",
    "- [x] 4",
    "</artefacto>",
    "Rendilo y avisame.",
  ].join("\n");
  const result = extractArtefactos(text);
  assert.equal(result.blocks.length, 1);
  assert.equal(result.blocks[0].tipo, "examen");
  assert.equal(result.blocks[0].titulo, "Simulacro 1");
  assert.match(result.blocks[0].contenido, /^# Simulacro 1/);
  const replaced = result.replace([ID_A]);
  assert.equal(replaced, `Te armé un simulacro.\n\n[[artefacto:${ID_A}]]\n\nRendilo y avisame.`);
});

test("keeps the id of an edited artefacto and strips markdown fences", () => {
  const text = `<artefacto id="${ID_B}" tipo="documento" titulo="Guía">\n\`\`\`markdown\n# Guía\nTexto\n\`\`\`\n</artefacto>`;
  const [block] = extractArtefactos(text).blocks;
  assert.equal(block.id, ID_B);
  assert.equal(block.tipo, "documento");
  assert.equal(block.contenido, "# Guía\nTexto");
});

test("recovers an unclosed artefacto when the reply is truncated", () => {
  const { blocks } = extractArtefactos('<artefacto titulo="Resumen">\n# Resumen\n- punto');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].tipo, "documento");
});

test("leaves plain answers untouched", () => {
  const result = extractArtefactos("Una respuesta común.");
  assert.equal(result.blocks.length, 0);
  assert.equal(result.replace([]), "Una respuesta común.");
});

test("splits message content around artefacto markers", () => {
  const parts = splitArtefactoMarkers(`Antes\n\n[[artefacto:${ID_A}]]\n\nDespués`);
  assert.deepEqual(parts, [
    { kind: "text", text: "Antes" },
    { kind: "artefacto", id: ID_A },
    { kind: "text", text: "Después" },
  ]);
});

test("parses multiple choice and open questions with temas", () => {
  const examen = parseExamen(
    [
      "# Parcial simulado",
      "Tenés 90 minutos.",
      "",
      "## 1. ¿Qué es una derivada?",
      "Tema: Derivadas",
      "- [ ] Un área",
      "- [x] Una tasa de cambio",
      "- [ ] Una integral",
      "> Explicación: mide la variación instantánea.",
      "",
      "## 2. Calculá $\\int_0^1 x\\,dx$",
      "**Tema:** Integrales",
      "Mostrá el desarrollo.",
      "> Respuesta: vale $1/2$.",
      "> Por regla de Barrow.",
    ].join("\n")
  );
  assert.equal(examen.intro, "# Parcial simulado\nTenés 90 minutos.");
  assert.equal(examen.preguntas.length, 2);
  const [mc, open] = examen.preguntas;
  assert.equal(mc.tema, "Derivadas");
  assert.equal(mc.opciones.length, 3);
  assert.equal(mc.opciones.findIndex((o) => o.correcta), 1);
  assert.equal(mc.explicacion, "mide la variación instantánea.");
  assert.equal(open.tema, "Integrales");
  assert.equal(open.opciones.length, 0);
  assert.match(open.enunciado, /Mostrá el desarrollo/);
  assert.equal(open.respuesta, "vale $1/2$.\nPor regla de Barrow.");
});

test("normalizes tema names for matching", () => {
  assert.equal(normalizeTemaName("  Límites y Continuidad "), "limites y continuidad");
  assert.equal(normalizeTemaName("Límites-y-continuidad"), "limites y continuidad");
});
