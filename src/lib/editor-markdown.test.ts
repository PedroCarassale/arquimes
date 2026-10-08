import assert from "node:assert/strict";
import test from "node:test";
import { extractoPlano, normalizeEditorMarkdown } from "./editor-markdown.ts";

test("convierte la fórmula inline con paréntesis escapados a $..$", () => {
  assert.equal(normalizeEditorMarkdown(String.raw`Sea \(a+b\) un número.`), "Sea $a+b$ un número.");
});

test("convierte la fórmula en bloque con corchetes escapados a $$ en líneas propias", () => {
  assert.equal(normalizeEditorMarkdown(String.raw`\[x\]`), "$$\nx\n$$");
});

test("deja igual el texto sin fórmulas", () => {
  const input = "## Clase 3\n\n- [ ] Repasar límites\n- [x] Leer el capítulo 2\n\n| a | b |\n| - | - |\n| 1 | 2 |";
  assert.equal(normalizeEditorMarkdown(input), input);
});

test("deja igual las fórmulas que ya usan $", () => {
  const input = "La energía es $E = mc^2$.\n\n$$\n\int_0^1 x\,dx\n$$";
  assert.equal(normalizeEditorMarkdown(input), input);
});

test("no toca los escapes dentro de bloques de código", () => {
  const input = "```latex\n\(a+b\)\n```";
  assert.equal(normalizeEditorMarkdown(input), input);
});

test("el texto vacío queda vacío", () => {
  assert.equal(normalizeEditorMarkdown(""), "");
});

test("el extracto saca la sintaxis de Markdown y deja el texto", () => {
  const input =
    "## Temas vistos\n\n- Límites **laterales** y _continuidad_\n- [ ] Repasar `lim`\n\n$$\n\int x\,dx\n$$\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n---\n\nVer [el apunte](https://example.com).";
  assert.equal(
    extractoPlano(input),
    "Temas vistos Límites laterales y continuidad Repasar lim a b 1 2 Ver el apunte."
  );
});

test("el extracto corta en una palabra y agrega puntos suspensivos", () => {
  const extracto = extractoPlano("palabra ".repeat(40), 30);
  assert.ok(extracto.length <= 31);
  assert.ok(extracto.endsWith("palabra…"));
});

test("el extracto de una clase vacía es vacío", () => {
  assert.equal(extractoPlano(""), "");
});

test("no altera contenido legítimo de una nota", () => {
  for (const input of ["Cuesta $$ 100", "  sangría inicial", "Primera línea\nnull", "undefined", "Usar `\(x\)` en código"]) {
    assert.equal(normalizeEditorMarkdown(input), input);
  }
});

test("saca los <br /> que dejaba el editor como línea vacía, fuera del código", () => {
  const input = "Uno\n\n<br />\n\nDos\n\n- a\n- <br />\n\n| x | y |\n| - | - |\n| <br /> | 2 |\n\n```html\n<br />\n```";
  assert.equal(
    normalizeEditorMarkdown(input),
    "Uno\n\n\nDos\n\n- a\n-\n\n| x | y |\n| - | - |\n|  | 2 |\n\n```html\n<br />\n```"
  );
});

test("el extracto no muestra LaTeX, HTML ni el contenido de los bloques de código", () => {
  const input = String.raw`Pegado

- item a
- item b

| x | y |
|---|---|
| 1 | 2 |

Fórmula $\alpha + \beta$ y **fuerte**.`;
  assert.equal(extractoPlano(input), "Pegado item a item b x y 1 2 Fórmula α + β y fuerte.");
  assert.equal(
    extractoPlano(String.raw`# Concepto

Gradiente $\nabla f$

` + "```\ndef f(x):\n    return x**2\n```\n\n<br />\n\n**La regla** de la cadena."),
    "Concepto Gradiente ∇ f La regla de la cadena."
  );
  assert.equal(
    extractoPlano(String.raw`Un campo es conservativo si $\nabla \times F = 0$ en una región.

$$
\int_0^1 x^2\,dx
$$

- punto
- <br />`),
    "Un campo es conservativo si ∇ × F = 0 en una región. punto"
  );
  assert.equal(extractoPlano(String.raw`Cuesta \$100 y no es fórmula`),"Cuesta $100 y no es fórmula");
  assert.equal(extractoPlano("~~~py\nprint(1)\n~~~\nDespués"), "Después");
});
