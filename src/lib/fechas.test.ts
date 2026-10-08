import assert from "node:assert/strict";
import test from "node:test";
import {
  ZONA,
  cuentaRegresiva,
  diasHasta,
  fechaCorta,
  fechaLarga,
  formatHora,
  grupoAgenda,
  hoyYmd,
  mesActual,
  mesGrid,
  mesTitulo,
  mesVecino,
  parseYmd,
  sumarDias,
  toYmd,
} from "./fechas.ts";

const JUEVES = new Date("2026-10-08T15:00:00Z");

test("hoyYmd usa la zona de Buenos Aires", () => {
  assert.equal(hoyYmd(JUEVES), "2026-10-08");
  assert.equal(hoyYmd(new Date("2026-10-09T02:30:00Z")), "2026-10-08");
  assert.equal(hoyYmd(new Date("2026-10-09T03:30:00Z")), "2026-10-09");
  assert.equal(hoyYmd(new Date("2026-10-09T02:30:00Z"), "UTC"), "2026-10-09");
  assert.equal(ZONA, "America/Argentina/Buenos_Aires");
});

test("parseYmd y toYmd trabajan en fecha local, nunca UTC", () => {
  const date = parseYmd("2026-10-15");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 15);
  assert.equal(date.getHours(), 0);
  assert.equal(toYmd(date), "2026-10-15");
  assert.ok(Number.isNaN(parseYmd("2026-02-31").getTime()));
  assert.ok(Number.isNaN(parseYmd("15/10/2026").getTime()));
});

test("diasHasta con fechas locales", () => {
  assert.equal(diasHasta("2026-10-08", JUEVES), 0);
  assert.equal(diasHasta("2026-10-15", JUEVES), 7);
  assert.equal(diasHasta("2026-10-07", JUEVES), -1);
  assert.equal(diasHasta("2026-10-15", new Date("2026-10-09T02:59:00Z")), 7);
  assert.equal(diasHasta("2026-10-15", new Date("2026-10-08T03:01:00Z")), 7);
  assert.equal(diasHasta(undefined, JUEVES), null);
  assert.equal(diasHasta("", JUEVES), null);
  assert.equal(diasHasta("mañana", JUEVES), null);
});

test("sumarDias cruza meses, años y cambios de horario", () => {
  assert.equal(sumarDias("2026-10-08", 7), "2026-10-15");
  assert.equal(sumarDias("2026-10-31", 1), "2026-11-01");
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(sumarDias("2026-03-01", -1), "2026-02-28");
  assert.equal(sumarDias("2026-03-28", 2), "2026-03-30");
  assert.equal(sumarDias("2026-10-24", 2), "2026-10-26");
  assert.equal(sumarDias("2026-10-08", 365), "2027-10-08");
});

test("diasHasta no se corre en el cambio de horario", () => {
  const antes = new Date("2026-03-28T15:00:00Z");
  assert.equal(diasHasta("2026-03-30", antes), 2);
  const otoñoEuropa = new Date("2026-10-24T15:00:00Z");
  assert.equal(diasHasta("2026-10-26", otoñoEuropa), 2);
});

test("cuentaRegresiva en 0, 1, 2, 14, 15 días y en pasado", () => {
  assert.equal(cuentaRegresiva("2026-10-08", JUEVES), "hoy");
  assert.equal(cuentaRegresiva("2026-10-09", JUEVES), "mañana");
  assert.equal(cuentaRegresiva("2026-10-10", JUEVES), "pasado mañana");
  assert.equal(cuentaRegresiva("2026-10-15", JUEVES), "en 7 días");
  assert.equal(cuentaRegresiva("2026-10-22", JUEVES), "en 14 días");
  assert.equal(cuentaRegresiva("2026-10-23", JUEVES), "el 23 de octubre");
  assert.equal(cuentaRegresiva("2026-11-03", JUEVES), "el 3 de noviembre");
  assert.equal(cuentaRegresiva("2027-03-02", JUEVES), "el 2 de marzo de 2027");
  assert.equal(cuentaRegresiva("2026-10-07", JUEVES), "ayer");
  assert.equal(cuentaRegresiva("2026-10-03", JUEVES), "hace 5 días");
  assert.equal(cuentaRegresiva(undefined, JUEVES), null);
});

test("fechaLarga y fechaCorta en minúscula con día de la semana", () => {
  assert.equal(fechaLarga("2026-10-15", JUEVES), "jueves 15 de octubre");
  assert.equal(fechaLarga("2026-10-08", JUEVES), "jueves 8 de octubre");
  assert.equal(fechaLarga("2027-03-02", JUEVES), "martes 2 de marzo de 2027");
  assert.equal(fechaLarga("2026-10-11", JUEVES), "domingo 11 de octubre");
  assert.equal(fechaLarga(undefined, JUEVES), null);
  assert.equal(fechaCorta("2026-10-15"), "15 oct");
  assert.equal(fechaCorta("2026-09-02"), "2 sep");
  assert.equal(fechaCorta("2026-10-09T01:00:00.000Z"), "8 oct");
  assert.equal(fechaCorta("nada"), null);
});

test("meses: título, actual y vecinos", () => {
  assert.equal(mesTitulo("2026-10"), "Octubre 2026");
  assert.equal(mesTitulo("2027-01"), "Enero 2027");
  assert.equal(mesActual(JUEVES), "2026-10");
  assert.equal(mesVecino("2026-10", 1), "2026-11");
  assert.equal(mesVecino("2026-12", 1), "2027-01");
  assert.equal(mesVecino("2026-01", -1), "2025-12");
  assert.equal(mesVecino("2026-10", -14), "2025-08");
});

test("mesGrid de octubre 2026 empieza el lunes 28 de septiembre", () => {
  const grid = mesGrid("2026-10");
  assert.equal(grid.length, 35);
  assert.deepEqual(grid[0], { ymd: "2026-09-28", enMes: false });
  assert.deepEqual(grid[3], { ymd: "2026-10-01", enMes: true });
  assert.deepEqual(grid[33], { ymd: "2026-10-31", enMes: true });
  assert.deepEqual(grid[34], { ymd: "2026-11-01", enMes: false });
  assert.equal(grid.filter((cell) => cell.enMes).length, 31);
});

test("mesGrid siempre arma semanas completas de 35 o 42 celdas", () => {
  for (let month = 1; month <= 24; month += 1) {
    const year = 2026 + Math.floor((month - 1) / 12);
    const mes = `${year}-${String(((month - 1) % 12) + 1).padStart(2, "0")}`;
    const grid = mesGrid(mes);
    assert.ok(grid.length === 35 || grid.length === 42, `${mes}: ${grid.length}`);
    assert.equal(parseYmd(grid[0].ymd).getDay(), 1, mes);
  }
  assert.equal(mesGrid("2027-02").length, 35);
  assert.equal(mesGrid("2026-08").length, 42);
});

test("grupoAgenda agrupa por cercanía y después por mes", () => {
  assert.equal(grupoAgenda("2026-10-08", JUEVES), "Hoy");
  assert.equal(grupoAgenda("2026-10-09", JUEVES), "Mañana");
  assert.equal(grupoAgenda("2026-10-11", JUEVES), "Esta semana");
  assert.equal(grupoAgenda("2026-10-12", JUEVES), "La que viene");
  assert.equal(grupoAgenda("2026-10-18", JUEVES), "La que viene");
  assert.equal(grupoAgenda("2026-10-19", JUEVES), "Octubre");
  assert.equal(grupoAgenda("2026-11-03", JUEVES), "Noviembre");
  assert.equal(grupoAgenda("2027-01-10", JUEVES), "Enero 2027");
  assert.equal(grupoAgenda(undefined, JUEVES), "Sin fecha");
});

test("formatHora", () => {
  assert.equal(formatHora("18:00"), "18:00");
  assert.equal(formatHora("9:05"), "09:05");
  assert.equal(formatHora("24:00"), null);
  assert.equal(formatHora(""), null);
  assert.equal(formatHora(undefined), null);
});
