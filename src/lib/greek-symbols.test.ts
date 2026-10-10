import assert from "node:assert/strict";
import test from "node:test";
import { findSymbolTrigger, insideOpenSpan, symbolFor } from "./greek-symbols.ts";

test("mapea nombres griegos en minúscula, mayúscula y castellano", () => {
  assert.equal(symbolFor("sigma"), "σ");
  assert.equal(symbolFor("Sigma"), "Σ");
  assert.equal(symbolFor("theta"), "θ");
  assert.equal(symbolFor("tita"), "θ");
  assert.equal(symbolFor("Tita"), "Θ");
  assert.equal(symbolFor("fi"), "φ");
  assert.equal(symbolFor("ji"), "χ");
  assert.equal(symbolFor("ro"), "ρ");
  assert.equal(symbolFor("Delta"), "Δ");
  assert.equal(symbolFor("Omega"), "Ω");
});

test("respeta las variantes de LaTeX", () => {
  assert.equal(symbolFor("epsilon"), "ϵ");
  assert.equal(symbolFor("varepsilon"), "ε");
  assert.equal(symbolFor("phi"), "ϕ");
  assert.equal(symbolFor("varphi"), "φ");
  assert.equal(symbolFor("vartheta"), "ϑ");
  assert.equal(symbolFor("infty"), "∞");
  assert.equal(symbolFor("SIGMA"), null);
  assert.equal(symbolFor("hola"), null);
});

test("detecta el disparador con barra invertida o barra al inicio de palabra", () => {
  assert.deepEqual(findSymbolTrigger(String.raw`\sigma`), { start: 0, end: 6, name: "sigma", symbol: "σ" });
  assert.deepEqual(findSymbolTrigger("la tensión /sigma"), { start: 11, end: 17, name: "sigma", symbol: "σ" });
  assert.equal(findSymbolTrigger(String.raw`ángulo (\theta`)?.symbol, "θ");
  assert.equal(findSymbolTrigger(`\ufffc${String.raw`\pi`}`)?.symbol, "π");
});

test("no dispara en medio de una palabra ni con nombres desconocidos", () => {
  assert.equal(findSymbolTrigger("km/h"), null);
  assert.equal(findSymbolTrigger("y/o"), null);
  assert.equal(findSymbolTrigger("1/pi"), null);
  assert.equal(findSymbolTrigger(String.raw`a\pi`), null);
  assert.equal(findSymbolTrigger("/hola"), null);
  assert.equal(findSymbolTrigger("/"), null);
});

test("no dispara dentro de una fórmula sin cerrar", () => {
  assert.equal(findSymbolTrigger(String.raw`sea $x + \sigma`), null);
  assert.equal(findSymbolTrigger(String.raw`$$ \sigma`), null);
  assert.equal(findSymbolTrigger(String.raw`sea $x$ y \sigma`)?.symbol, "σ");
  assert.equal(findSymbolTrigger(String.raw`cuesta \$5 y \pi`)?.symbol, "π");
  assert.equal(insideOpenSpan("$a$ $b"), true);
  assert.equal(insideOpenSpan("$$a$$"), false);
});

test("no dispara dentro de código en línea sin cerrar", () => {
  assert.equal(findSymbolTrigger(String.raw`usá ${"`"}printf \pi`), null);
  assert.equal(findSymbolTrigger(String.raw`${"``"}a ${"`"} \pi`), null);
  assert.equal(findSymbolTrigger(String.raw`${"`"}x${"`"} y \pi`)?.symbol, "π");
  assert.equal(insideOpenSpan("`$` $"), true);
  assert.equal(insideOpenSpan("$`$ `"), true);
});
