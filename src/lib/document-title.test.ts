import { test } from "node:test";
import assert from "node:assert/strict";
import { APP_TITLE, ROOT_TITLE_TEMPLATE, documentTitle, materiaTitleTemplate } from "./document-title.ts";

test("arma el título del lugar más específico primero", () => {
  assert.equal(documentTitle(), APP_TITLE);
  assert.equal(documentTitle(null, "Análisis II"), "Análisis II — Arquímedes");
  assert.equal(documentTitle("Clase 3", "Análisis II"), "Clase 3 · Análisis II — Arquímedes");
  assert.equal(documentTitle("Calendario"), "Calendario — Arquímedes");
});

test("ignora partes vacías y normaliza espacios", () => {
  assert.equal(documentTitle("   ", "  Física  "), "Física — Arquímedes");
  assert.equal(documentTitle("Clase\n 3", ""), "Clase 3 — Arquímedes");
  assert.equal(documentTitle(undefined, undefined), "Arquímedes");
});

test("las plantillas de Next coinciden con el título del cliente", () => {
  assert.equal(materiaTitleTemplate("Física").replace("%s", "Clases"), documentTitle("Clases", "Física"));
  assert.equal(ROOT_TITLE_TEMPLATE.replace("%s", "Perfil"), documentTitle("Perfil"));
});
