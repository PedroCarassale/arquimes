import assert from "node:assert/strict";
import test from "node:test";
import {
  EVALUACION_ERRORES,
  parseEvaluacionInput,
  parseRangoEventos,
} from "./evaluacion-input.ts";

test("el rango de eventos exige fechas válidas y como mucho 400 días", () => {
  const rango = (query: string) => parseRangoEventos(new URLSearchParams(query));
  assert.deepEqual(rango("desde=2026-10-01&hasta=2026-10-31"), {
    desde: "2026-10-01",
    hasta: "2026-10-31",
  });
  assert.ok("desde" in rango("desde=2026-01-01&hasta=2027-02-05"));
  assert.ok("error" in rango("desde=2026-01-01&hasta=2027-02-06"));
  assert.ok("error" in rango("desde=2026-10-31&hasta=2026-10-01"));
  assert.ok("error" in rango("desde=2026-10-01"));
  assert.ok("error" in rango("desde=1/10/2026&hasta=2026-10-31"));
});

test("acepta los tres tipos de evento y los subtipos de examen", () => {
  assert.equal(parseEvaluacionInput({ kind: "examen" }).kind, "examen");
  assert.equal(parseEvaluacionInput({ kind: "entrega" }).kind, "entrega");
  assert.equal(parseEvaluacionInput({ kind: "evento" }).kind, "evento");
  assert.equal(parseEvaluacionInput({ kind: "otra cosa" }).kind, undefined);
  assert.equal(parseEvaluacionInput({ type: "parcial" }).type, "parcial");
  assert.equal(parseEvaluacionInput({ type: "recuperatorio" }).type, "recuperatorio");
  assert.equal(parseEvaluacionInput({ type: "final" }).type, "final");
  assert.equal(parseEvaluacionInput({ type: "coloquio" }).type, undefined);
});

test("valida la hora HH:MM y deja borrarla con vacío", () => {
  const ok = parseEvaluacionInput({ name: "Primer parcial", hora: "18:00" });
  assert.equal(ok.hora, "18:00");
  assert.equal(ok.error, undefined);
  assert.equal(parseEvaluacionInput({ hora: "00:00" }).hora, "00:00");
  assert.equal(parseEvaluacionInput({ hora: "23:59" }).error, undefined);

  const cleared = parseEvaluacionInput({ hora: "" });
  assert.equal(cleared.hora, "");
  assert.equal(cleared.error, undefined);

  assert.equal(parseEvaluacionInput({}).hora, undefined);

  for (const hora of ["24:00", "9:00", "18:60", "18h", "18:00:00"]) {
    assert.equal(parseEvaluacionInput({ hora }).error, EVALUACION_ERRORES.hora, hora);
  }
  assert.equal(EVALUACION_ERRORES.hora, "La hora tiene que ser HH:MM.");
});

test("la fecha vacía borra y una inválida es error", () => {
  assert.equal(parseEvaluacionInput({ date: "2026-10-15" }).date, "2026-10-15");
  const cleared = parseEvaluacionInput({ date: "" });
  assert.equal(cleared.date, "");
  assert.equal(cleared.error, undefined);
  assert.equal(parseEvaluacionInput({ date: "15/10/2026" }).error, EVALUACION_ERRORES.fecha);
  assert.equal(parseEvaluacionInput({ date: "2026-02-31" }).error, EVALUACION_ERRORES.fecha);
});

test("recorta textos y deduplica temas", () => {
  const parsed = parseEvaluacionInput({
    name: "  Primer parcial  ",
    description: "  Entra hasta integrales  ",
    temas: [" Límites ", "Derivadas", "Límites", "", 3],
  });
  assert.equal(parsed.name, "Primer parcial");
  assert.equal(parsed.description, "Entra hasta integrales");
  assert.deepEqual(parsed.temas, ["Límites", "Derivadas"]);
  assert.deepEqual(parseEvaluacionInput(null).temas, []);
});
