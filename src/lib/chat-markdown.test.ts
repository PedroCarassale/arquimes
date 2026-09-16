import assert from "node:assert/strict";
import test from "node:test";
import { preprocessAssistantMarkdown } from "./chat-markdown.ts";

test("repara el patrón mixto que absorbía el resto del mensaje", () => {
  const input = String.raw`## Antes

$$
u = f(x_1,x_2,\dots,x_n)$$

**La negrita sigue funcionando.**

---

## Después`;

  assert.equal(
    preprocessAssistantMarkdown(input),
    String.raw`## Antes

$$
u = f(x_1,x_2,\dots,x_n)
$$

**La negrita sigue funcionando.**

---

## Después`
  );
});

test("repara un cierre display huérfano cuando la línea parece matemática", () => {
  assert.equal(
    preprocessAssistantMarkdown(String.raw`u = f(x_1,x_2)$$

## Resultado`),
    String.raw`$$
u = f(x_1,x_2)
$$

## Resultado`
  );
});

test("elimina un display sin cierre antes de que consuma Markdown posterior", () => {
  const output = preprocessAssistantMarkdown(String.raw`$$
\frac{a}{b}

## El formato continúa

**Importante**`);

  assert.equal(
    output,
    String.raw`\frac{a}{b}

## El formato continúa

**Importante**`
  );
  assert.equal(countUnescapedDoubleDollars(output), 0);
});

test("normaliza delimitadores TeX y conserva displays válidos", () => {
  const input = String.raw`Inline: \(x_1 + x_2\).

\[
\Delta u = \sum_i \Delta x_i
\]

$$
y = g(t)
$$`;
  const output = preprocessAssistantMarkdown(input);

  assert.match(output, /Inline: \$x_1 \+ x_2\$\./);
  assert.match(output, /\$\$\n\\Delta u = \\sum_i \\Delta x_i\n\$\$/);
  assert.match(output, /\$\$\ny = g\(t\)\n\$\$/);
  assert.equal(countUnescapedDoubleDollars(output) % 2, 0);
});

test("no toca delimitadores dentro de código fenced o inline", () => {
  const input = String.raw`Ejemplo: \`valor$$\`

\`\`\`text
$$
x$$
\`\`\``;

  assert.equal(preprocessAssistantMarkdown(input), input);
});

test("escapa dólares inline desbalanceados sin cambiar pares válidos", () => {
  assert.equal(
    preprocessAssistantMarkdown("Válido $x+1$ e inválido $sin cierre."),
    String.raw`Válido \$x+1\$ e inválido \$sin cierre.`
  );
  assert.equal(
    preprocessAssistantMarkdown("Solo $x+1$ permanece."),
    "Solo $x+1$ permanece."
  );
});

function countUnescapedDoubleDollars(value: string): number {
  return [...value.matchAll(/(?<!\\)\$\$/g)].length;
}
