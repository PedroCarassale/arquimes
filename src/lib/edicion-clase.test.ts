import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buscarEncabezado,
  edicionesDeMensaje,
  finDeSeccion,
  normalizarEncabezado,
  parseDonde,
  procesarEdiciones,
  parseRegistro,
  reemplazoPermitido,
  registrarEdicion,
  serializeEdicion,
  sinEdiciones,
  sinRegistros,
  splitEdiciones,
  type EncabezadoDoc,
} from "./edicion-clase.ts";

const NOTA = "33333333-3333-4333-8333-333333333333";

test("parses an append block and keeps the surrounding sentence", () => {
  const text = [
    "Listo, lo agregué al final.",
    '<edicion-clase modo="agregar" donde="final">',
    "### Continuidad",
    "$f$ es continua en $a$ si $\\lim_{x \\to a} f(x) = f(a)$.",
    "</edicion-clase>",
  ].join("\n");
  const parts = splitEdiciones(text);
  assert.equal(parts.length, 2);
  assert.deepEqual(parts[0], { kind: "text", text: "Listo, lo agregué al final." });
  assert.equal(parts[1].kind, "edicion");
  if (parts[1].kind !== "edicion") return;
  assert.equal(parts[1].edicion.modo, "agregar");
  assert.deepEqual(parts[1].edicion.donde, { tipo: "final" });
  assert.equal(
    parts[1].edicion.markdown,
    "### Continuidad\n$f$ es continua en $a$ si $\\lim_{x \\to a} f(x) = f(a)$."
  );
});

test("reads donde targets leniently", () => {
  assert.deepEqual(parseDonde("final"), { tipo: "final" });
  assert.deepEqual(parseDonde(undefined), { tipo: "final" });
  assert.deepEqual(parseDonde("algo raro"), { tipo: "final" });
  assert.deepEqual(parseDonde("cursor"), { tipo: "cursor" });
  assert.deepEqual(parseDonde("acá"), { tipo: "cursor" });
  assert.deepEqual(parseDonde("despues:## Límites"), { tipo: "despues", encabezado: "Límites" });
  assert.deepEqual(parseDonde("después de: «Límites laterales»"), {
    tipo: "despues",
    encabezado: "Límites laterales",
  });
  assert.deepEqual(parseDonde("despues:"), { tipo: "final" });
  assert.deepEqual(parseDonde("seccion:Derivadas", "reemplazar"), { tipo: "seccion", encabezado: "Derivadas" });
  assert.deepEqual(parseDonde("seccion:Derivadas"), { tipo: "despues", encabezado: "Derivadas" });
});

test("replace without a heading target falls back to appending", () => {
  const [part] = splitEdiciones('<edicion-clase modo="reemplazar" donde="final">Texto</edicion-clase>');
  assert.equal(part.kind, "edicion");
  if (part.kind !== "edicion") return;
  assert.equal(part.edicion.modo, "agregar");
  assert.deepEqual(part.edicion.donde, { tipo: "final" });
});

test("replace with a section target stays a replacement", () => {
  const [part] = splitEdiciones('<edicion-clase modo="reemplazar" donde="seccion:Derivadas">Nuevo</edicion-clase>');
  assert.equal(part.kind, "edicion");
  if (part.kind !== "edicion") return;
  assert.equal(part.edicion.modo, "reemplazar");
  assert.deepEqual(part.edicion.donde, { tipo: "seccion", encabezado: "Derivadas" });
});

test("strips a markdown fence around the fragment and tolerates a missing closing tag", () => {
  const parts = splitEdiciones('Agregado.\n<edicion-clase donde="cursor">\n```markdown\n- uno\n- dos\n```');
  assert.equal(parts.length, 2);
  assert.equal(parts[1].kind, "edicion");
  if (parts[1].kind !== "edicion") return;
  assert.equal(parts[1].edicion.markdown, "- uno\n- dos");
  assert.deepEqual(parts[1].edicion.donde, { tipo: "cursor" });
});

test("drops empty blocks", () => {
  assert.deepEqual(splitEdiciones('Hola <edicion-clase modo="agregar"> </edicion-clase>'), [
    { kind: "text", text: "Hola" },
  ]);
});

test("procesarEdiciones stamps the open clase and rewrites a canonical block", () => {
  const raw = 'Listo.\n<edicion-clase nota="otra" modo="agregar" donde="despues:Límites">Def.</edicion-clase>';
  const result = procesarEdiciones(raw, { id: NOTA, titulo: 'Clase "3"' });
  assert.equal(result.ediciones.length, 1);
  assert.equal(result.ediciones[0].notaId, NOTA);
  assert.equal(result.ediciones[0].titulo, 'Clase "3"');
  assert.equal(
    result.text,
    `Listo.\n\n<edicion-clase nota="${NOTA}" titulo="Clase &quot;3&quot;" modo="agregar" donde="despues:Límites">\nDef.\n</edicion-clase>`
  );
  const [again] = edicionesDeMensaje(result.text);
  assert.deepEqual(again, result.ediciones[0]);
});

test("procesarEdiciones without a clase in focus unwraps the fragment into the chat", () => {
  const raw = 'Te lo dejo acá.\n<edicion-clase modo="agregar">**Def.** algo</edicion-clase>';
  const result = procesarEdiciones(raw, null);
  assert.deepEqual(result.ediciones, []);
  assert.equal(result.text, "Te lo dejo acá.\n\n**Def.** algo");
  assert.deepEqual(edicionesDeMensaje(result.text), []);
});

test("procesarEdiciones leaves text without blocks untouched", () => {
  const raw = "Respuesta común con <b>html</b>.";
  assert.deepEqual(procesarEdiciones(raw, { id: NOTA, titulo: "Clase 1" }), { text: raw, ediciones: [] });
});

test("only blocks stamped with a nota count as edits to apply", () => {
  const content = [
    "Uno.",
    serializeEdicion({ modo: "agregar", donde: { tipo: "final" }, markdown: "A", notaId: NOTA, titulo: "Clase 1" }),
    '<edicion-clase modo="agregar">B</edicion-clase>',
  ].join("\n");
  const ediciones = edicionesDeMensaje(content);
  assert.equal(ediciones.length, 1);
  assert.equal(ediciones[0].markdown, "A");
});

test("sinEdiciones unwraps or drops the fragments", () => {
  const content = `Listo.\n\n${serializeEdicion({
    modo: "agregar",
    donde: { tipo: "final" },
    markdown: "### Def\nTexto",
    notaId: NOTA,
    titulo: "Clase 1",
  })}`;
  assert.equal(sinEdiciones(content), "Listo.\n\n### Def\nTexto");
  assert.equal(sinEdiciones(content, "drop"), "Listo.");
  assert.equal(sinEdiciones("Nada que ver"), "Nada que ver");
});

test("normalizarEncabezado ignores case, accents, markup and trailing colons", () => {
  assert.equal(normalizarEncabezado("**Límites  laterales**:"), "limites laterales");
  assert.equal(normalizarEncabezado("límites laterales"), normalizarEncabezado("LIMITES LATERALES"));
});

const ENCABEZADOS: EncabezadoDoc[] = [
  { nivel: 1, texto: "Clase 3" },
  { nivel: 2, texto: "Límites" },
  { nivel: 3, texto: "Límites laterales" },
  { nivel: 2, texto: "Derivadas" },
  { nivel: 2, texto: "Ejemplos de derivadas" },
  { nivel: 2, texto: "Derivadas" },
];

test("buscarEncabezado only accepts a normalized exact match and picks the first one", () => {
  assert.equal(buscarEncabezado(ENCABEZADOS, "Derivadas"), 3);
  assert.equal(buscarEncabezado(ENCABEZADOS, "**DERIVADAS**:"), 3);
  assert.equal(buscarEncabezado(ENCABEZADOS, "limites laterales"), 2);
  assert.equal(buscarEncabezado(ENCABEZADOS, "Ejemplos de derivadas"), 4);
});

test("buscarEncabezado rejects near misses instead of guessing", () => {
  assert.equal(buscarEncabezado([{ nivel: 2, texto: "Derivadas" }], "Ejemplos de derivadas"), -1);
  assert.equal(buscarEncabezado([{ nivel: 2, texto: "Ejemplos de derivadas" }], "Derivadas"), -1);
  assert.equal(buscarEncabezado(ENCABEZADOS, "Límite"), -1);
  assert.equal(buscarEncabezado(ENCABEZADOS, "Clase"), -1);
  assert.equal(buscarEncabezado(ENCABEZADOS, "  "), -1);
  assert.equal(buscarEncabezado([], "Derivadas"), -1);
});

test("finDeSeccion stops at the next heading of the same or a higher level", () => {
  assert.equal(finDeSeccion(ENCABEZADOS, 0), -1);
  assert.equal(finDeSeccion(ENCABEZADOS, 1), 3);
  assert.equal(finDeSeccion(ENCABEZADOS, 2), 3);
  assert.equal(finDeSeccion(ENCABEZADOS, 3), 4);
  assert.equal(finDeSeccion(ENCABEZADOS, 5), -1);
});

test("reemplazoPermitido refuses replacing the whole note or most of it", () => {
  assert.equal(reemplazoPermitido({ seccion: 500, resto: 0 }), false);
  assert.equal(reemplazoPermitido({ seccion: 800, resto: 200 }), false);
  assert.equal(reemplazoPermitido({ seccion: 700, resto: 300 }), true);
  assert.equal(reemplazoPermitido({ seccion: 100, resto: 900 }), true);
  assert.equal(reemplazoPermitido({ seccion: 0, resto: 0 }), true);
});

test("registrarEdicion stores the applied state and the replaced markdown in the message", () => {
  const content = [
    "Listo.",
    serializeEdicion({ modo: "agregar", donde: { tipo: "final" }, markdown: "A", notaId: NOTA, titulo: "Clase 1" }),
    '<edicion-clase modo="agregar">sin nota</edicion-clase>',
    serializeEdicion({
      modo: "reemplazar",
      donde: { tipo: "seccion", encabezado: "Límites" },
      markdown: "Nuevo",
      notaId: NOTA,
      titulo: "Clase 1",
    }),
    "Fin.",
  ].join("\n");
  const previo = 'El límite de "f" con <b> & $\\frac{a}{b}$\n\n- uno';
  const next = registrarEdicion(content, 1, { estado: "aplicada", lugar: "seccion", aviso: null, reemplazado: previo });
  assert.ok(next);
  assert.ok(next.startsWith("Listo.\n"));
  assert.ok(next.endsWith("\nFin."));
  assert.ok(next.includes('<edicion-clase modo="agregar">sin nota</edicion-clase>'));
  const [primera, segunda] = edicionesDeMensaje(next);
  assert.equal(primera.registro, undefined);
  assert.deepEqual(segunda.registro, { estado: "aplicada", lugar: "seccion", aviso: null, reemplazado: previo });
  assert.equal(segunda.markdown, "Nuevo");
  assert.equal(registrarEdicion(content, 2, { estado: "aplicada", lugar: "final", aviso: null, reemplazado: null }), null);
});

test("registrarEdicion keeps the fallback notice and an empty replaced section", () => {
  const content = serializeEdicion({
    modo: "reemplazar",
    donde: { tipo: "seccion", encabezado: "Clase 3" },
    markdown: "Nuevo",
    notaId: NOTA,
  });
  const fallback = registrarEdicion(content, 0, { estado: "aplicada", lugar: "final", aviso: "demasiado", reemplazado: null });
  assert.ok(fallback);
  assert.deepEqual(edicionesDeMensaje(fallback)[0].registro, {
    estado: "aplicada",
    lugar: "final",
    aviso: "demasiado",
    reemplazado: null,
  });
  const vacia = registrarEdicion(content, 0, { estado: "aplicada", lugar: "seccion", aviso: null, reemplazado: "" });
  assert.ok(vacia);
  assert.equal(edicionesDeMensaje(vacia)[0].registro?.reemplazado, "");
  const deshecha = registrarEdicion(vacia, 0, { estado: "deshecha", lugar: "seccion", aviso: null, reemplazado: "" });
  assert.ok(deshecha);
  assert.equal(edicionesDeMensaje(deshecha)[0].registro?.estado, "deshecha");
});

test("parseRegistro validates what the client reports after applying", () => {
  assert.deepEqual(parseRegistro({ estado: "aplicada", lugar: "seccion", aviso: null, reemplazado: "Viejo" }), {
    estado: "aplicada",
    lugar: "seccion",
    aviso: null,
    reemplazado: "Viejo",
  });
  assert.deepEqual(parseRegistro({ estado: "aplicada", lugar: "final", aviso: "demasiado", reemplazado: "x" }), {
    estado: "aplicada",
    lugar: "final",
    aviso: "demasiado",
    reemplazado: null,
  });
  assert.equal(parseRegistro({ estado: "otra", lugar: "final" }), null);
  assert.equal(parseRegistro({ estado: "aplicada", lugar: "arriba" }), null);
  assert.equal(parseRegistro({ estado: "aplicada", lugar: "seccion", reemplazado: "largo" }, 3), null);
  assert.equal(parseRegistro(null), null);
});

test("sinRegistros hides the stored state from the model history and from Apuntes", () => {
  const base = serializeEdicion({
    modo: "reemplazar",
    donde: { tipo: "seccion", encabezado: "Límites" },
    markdown: "Nuevo",
    notaId: NOTA,
    titulo: "Clase 1",
  });
  const content = `Listo.\n\n${base}`;
  const registrado = registrarEdicion(content, 0, {
    estado: "aplicada",
    lugar: "seccion",
    aviso: null,
    reemplazado: "Texto viejo larguísimo",
  });
  assert.ok(registrado);
  assert.equal(sinRegistros(registrado), content);
  assert.equal(sinRegistros(content), content);
  assert.equal(sinEdiciones(registrado, "drop"), "Listo.");
  assert.ok(!sinEdiciones(registrado).includes("Texto viejo"));
});
