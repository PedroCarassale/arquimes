import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeAssistantContent,
  normalizeChatMessage,
  parseAssistantContent,
} from "./chat-message.ts";

test("extrae Markdown y citas de un sobre JSON válido", () => {
  const content = JSON.stringify({
    answer: String.raw`La fórmula es \(\Delta(a)=\frac{1}{2}\).`,
    citations: ["01- Teoría de Errores.pdf"],
  });

  assert.deepEqual(parseAssistantContent(content), {
    answer: String.raw`La fórmula es \(\Delta(a)=\frac{1}{2}\).`,
    citations: ["01- Teoría de Errores.pdf"],
  });
});

test("repara comandos TeX con barras sin escapar en JSON histórico", () => {
  const content = String.raw`{"answer":"Usá \(\frac{\Delta}{2}\).","citations":["errores.pdf"]}`;

  assert.deepEqual(parseAssistantContent(content), {
    answer: String.raw`Usá \(\frac{\Delta}{2}\).`,
    citations: ["errores.pdf"],
  });
});

test("extrae el pie de citas sin someter el TeX a JSON", () => {
  const content = String.raw`## Error relativo

\(\epsilon=\frac{\Delta}{|\alpha|}\)

<!-- ARQUIMES_CITATIONS: ["errores.pdf"] -->`;

  assert.deepEqual(parseAssistantContent(content), {
    answer: String.raw`## Error relativo

\(\epsilon=\frac{\Delta}{|\alpha|}\)`,
    citations: ["errores.pdf"],
  });
});

test("nunca entrega un sobre JSON inválido a la burbuja", () => {
  const normalized = normalizeAssistantContent(
    String.raw`{"answer":"\Delta sin cierre"`
  );

  assert.equal(normalized.answer.startsWith('{"answer"'), false);
  assert.match(normalized.answer, /No pude interpretar/);
});

test("normaliza mensajes antiguos y conserva sus citas guardadas", () => {
  const message = normalizeChatMessage({
    id: "assistant-1",
    role: "assistant",
    content: JSON.stringify({
      answer: String.raw`\(x=\frac{1}{2}\)`,
      citations: ["respuesta.pdf"],
    }),
    citations: ["guardada.pdf"],
    createdAt: "2026-09-16T00:00:00.000Z",
  });

  assert.equal(message.content, String.raw`\(x=\frac{1}{2}\)`);
  assert.deepEqual(message.citations, ["guardada.pdf", "respuesta.pdf"]);
});
