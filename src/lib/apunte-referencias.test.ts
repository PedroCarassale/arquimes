import assert from "node:assert/strict";
import test from "node:test";
import { filtrarReferencias, referenciaDe } from "./apunte-referencias.ts";
import type { ApunteItem } from "./types.ts";

const pdf: ApunteItem = {
  origen: "archivo",
  id: "a1",
  name: "Guía TP3.pdf",
  type: "application/pdf",
  size: 10,
  addedAt: "2026-10-01T00:00:00.000Z",
  esExamen: false,
};
const pergamino: ApunteItem = {
  origen: "generado",
  id: "g1",
  titulo: "Resumen de cinemática",
  tipo: "documento",
  version: 1,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

test("arma la referencia con el nombre y la ruta interna del apunte", () => {
  assert.deepEqual(
    { nombre: referenciaDe("m1", pdf).nombre, href: referenciaDe("m1", pdf).href },
    { nombre: "Guía TP3.pdf", href: "/materias/m1/apuntes/archivo/a1" }
  );
  assert.equal(referenciaDe("m1", pergamino).href, "/materias/m1/apuntes/generado/g1");
  assert.equal(referenciaDe("m1", pergamino).nombre, "Resumen de cinemática");
});

test("filtra sin distinguir tildes y prioriza las coincidencias al inicio", () => {
  const refs = [referenciaDe("m", pergamino), referenciaDe("m", pdf)];
  assert.deepEqual(filtrarReferencias(refs, "guia").map((r) => r.nombre), ["Guía TP3.pdf"]);
  assert.deepEqual(filtrarReferencias(refs, "CINEMATICA").map((r) => r.nombre), ["Resumen de cinemática"]);
  assert.equal(filtrarReferencias(refs, "").length, 2);
  const conOtra = [referenciaDe("m", { ...pdf, id: "a2", name: "Apunte guía.pdf" }), ...refs];
  assert.deepEqual(filtrarReferencias(conOtra, "gu").map((r) => r.nombre), ["Guía TP3.pdf", "Apunte guía.pdf"]);
  assert.deepEqual(filtrarReferencias(refs, "zzz"), []);
});
