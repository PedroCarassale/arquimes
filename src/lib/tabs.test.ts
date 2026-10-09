import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TABS,
  closeTab,
  defaultTitle,
  isDocumentKind,
  markSeen,
  moveTab,
  openPath,
  setTabTitle,
  tabKey,
  tabKindFromPath,
  type Tab,
} from "./tabs.ts";
import { rutas } from "./routes.ts";

const M = "mat-1";
const base = `/materias/${M}`;

function open(tabs: Tab[], href: string, prevActiveKey: string | null, extra: { now?: number; background?: boolean; title?: string } = {}) {
  return openPath(tabs, href, { materiaId: M, prevActiveKey, now: extra.now ?? 1, background: extra.background, title: extra.title });
}

function keys(tabs: Tab[]) {
  return tabs.map((tab) => tabKey(tab.href));
}

test("rutas serializa opciones en orden fijo", () => {
  assert.equal(rutas.apuntes(M), `${base}/apuntes`);
  assert.equal(rutas.apuntes(M, { orden: "nombre", tipo: "generados" }), `${base}/apuntes?tipo=generados&orden=nombre`);
  assert.equal(rutas.calendario(M), `${base}/calendario`);
  assert.equal(
    rutas.calendario(M, { fecha: "2026-10-15", nuevo: true, vista: "agenda", mes: "2026-10" }),
    `${base}/calendario?mes=2026-10&vista=agenda&nuevo=1&fecha=2026-10-15`
  );
  assert.equal(rutas.calendario(M, { nuevo: false }), `${base}/calendario`);
});

test("tabKey quita query, hash y barra final", () => {
  assert.equal(tabKey(`${base}/apuntes?tipo=generados`), `${base}/apuntes`);
  assert.equal(tabKey(`${base}/clases/abc/#x`), `${base}/clases/abc`);
  assert.equal(tabKey(`${base}/`), base);
  assert.equal(tabKey("/"), "/");
});

test("tabKindFromPath reconoce todas las rutas de la materia", () => {
  assert.equal(tabKindFromPath(M, base), "inicio");
  assert.equal(tabKindFromPath(M, `${base}/`), "inicio");
  assert.equal(tabKindFromPath(M, rutas.nueva(M)), "nueva");
  assert.equal(tabKindFromPath(M, rutas.clases(M)), "clases");
  assert.equal(tabKindFromPath(M, rutas.clase(M, "n1")), "clase");
  assert.equal(tabKindFromPath(M, rutas.apuntes(M, { tipo: "archivos" })), "apuntes");
  assert.equal(tabKindFromPath(M, rutas.archivo(M, "f1")), "archivo");
  assert.equal(tabKindFromPath(M, rutas.generado(M, "g1")), "generado");
  assert.equal(tabKindFromPath(M, rutas.calendario(M, { mes: "2026-10" })), "calendario");
  assert.equal(tabKindFromPath(M, rutas.evento(M, "e1")), "evento");
});

test("tabKindFromPath rechaza rutas ajenas", () => {
  assert.equal(tabKindFromPath(M, "/"), null);
  assert.equal(tabKindFromPath(M, "/calendario"), null);
  assert.equal(tabKindFromPath(M, "/materias/otra/clases"), null);
  assert.equal(tabKindFromPath(M, `/materias/${M}x/clases`), null);
  assert.equal(tabKindFromPath(M, `${base}/notas`), null);
  assert.equal(tabKindFromPath(M, `${base}/apuntes/archivo`), null);
  assert.equal(tabKindFromPath(M, `${base}/apuntes/otra/x`), null);
  assert.equal(tabKindFromPath(M, `${base}/clases/a/b`), null);
  assert.equal(tabKindFromPath(M, `${base}/nueva/x`), null);
});

test("defaultTitle e isDocumentKind", () => {
  assert.equal(defaultTitle("inicio"), "");
  assert.equal(defaultTitle("nueva"), "Pestaña nueva");
  assert.equal(defaultTitle("generado"), "Pergamino");
  assert.deepEqual(
    (["clase", "archivo", "generado", "evento", "clases", "apuntes", "calendario", "nueva", "inicio"] as const).map(isDocumentKind),
    [true, true, true, true, false, false, false, false, false]
  );
});

test("openPath ignora inicio y rutas ajenas", () => {
  const tabs: Tab[] = [];
  assert.equal(open(tabs, base, null), tabs);
  assert.equal(open(tabs, "/materias/otra/clases", null), tabs);
});

test("openPath agrega al final si la activa es inicio o null", () => {
  let tabs = open([], rutas.clases(M), base);
  tabs = open(tabs, rutas.apuntes(M), null);
  assert.deepEqual(keys(tabs), [rutas.clases(M), rutas.apuntes(M)]);
  assert.equal(tabs[0].title, "Clases");
  assert.equal(tabs[0].kind, "clases");
});

test("openPath inserta a la derecha de la activa", () => {
  let tabs = open([], rutas.clases(M), null);
  tabs = open(tabs, rutas.apuntes(M), rutas.clases(M));
  tabs = open(tabs, rutas.clase(M, "n1"), rutas.clases(M));
  assert.deepEqual(keys(tabs), [rutas.clases(M), rutas.clase(M, "n1"), rutas.apuntes(M)]);
});

test("openPath sobre una existente actualiza href sin reordenar", () => {
  let tabs = open([], rutas.apuntes(M), null, { now: 1 });
  tabs = open(tabs, rutas.clases(M), rutas.apuntes(M), { now: 2 });
  tabs = open(tabs, rutas.apuntes(M, { tipo: "generados" }), rutas.clases(M), { now: 3 });
  assert.deepEqual(keys(tabs), [rutas.apuntes(M), rutas.clases(M)]);
  assert.equal(tabs[0].href, `${base}/apuntes?tipo=generados`);
  assert.equal(tabs[0].at, 3);
});

test("openPath reemplaza la pestaña nueva en su lugar", () => {
  let tabs = open([], rutas.clases(M), null);
  tabs = open(tabs, rutas.nueva(M), rutas.clases(M));
  tabs = open(tabs, rutas.apuntes(M), rutas.nueva(M));
  tabs = open(tabs, rutas.calendario(M), rutas.apuntes(M));
  assert.deepEqual(keys(tabs), [rutas.clases(M), rutas.apuntes(M), rutas.calendario(M)]);

  tabs = open(tabs, rutas.nueva(M), rutas.clases(M));
  assert.deepEqual(keys(tabs), [rutas.clases(M), rutas.nueva(M), rutas.apuntes(M), rutas.calendario(M)]);
  const replaced = open(tabs, rutas.clase(M, "n9"), rutas.nueva(M));
  assert.deepEqual(keys(replaced), [rutas.clases(M), rutas.clase(M, "n9"), rutas.apuntes(M), rutas.calendario(M)]);
});

test("openPath hacia una existente desde nueva quita nueva y no duplica", () => {
  let tabs = open([], rutas.apuntes(M), null);
  tabs = open(tabs, rutas.nueva(M), rutas.apuntes(M));
  tabs = open(tabs, rutas.apuntes(M), rutas.nueva(M), { now: 5 });
  assert.deepEqual(keys(tabs), [rutas.apuntes(M)]);
  assert.equal(tabs[0].at, 5);
});

test("nueva es una sola", () => {
  let tabs = open([], rutas.nueva(M), null);
  tabs = open(tabs, rutas.nueva(M), rutas.nueva(M));
  assert.deepEqual(keys(tabs), [rutas.nueva(M)]);
});

test("background marca unread, no cambia at y se inserta tras la activa", () => {
  let tabs = open([], rutas.clases(M), null, { now: 1 });
  tabs = open(tabs, rutas.apuntes(M), rutas.clases(M), { now: 2 });
  tabs = open(tabs, rutas.generado(M, "g1"), rutas.clases(M), { now: 3, background: true, title: "Resumen" });
  assert.deepEqual(keys(tabs), [rutas.clases(M), rutas.generado(M, "g1"), rutas.apuntes(M)]);
  assert.equal(tabs[1].unread, true);
  assert.equal(tabs[1].title, "Resumen");

  const again = open(tabs, rutas.generado(M, "g1"), rutas.clases(M), { now: 9, background: true });
  assert.equal(again[1].unread, true);
  assert.equal(again[1].at, 3);

  const activated = open(tabs, rutas.generado(M, "g1"), rutas.clases(M), { now: 10 });
  assert.equal(activated[1].unread, undefined);
  assert.equal(activated[1].at, 10);
});

test("background desde nueva no reemplaza la pestaña nueva", () => {
  let tabs = open([], rutas.nueva(M), null);
  tabs = open(tabs, rutas.generado(M, "g1"), rutas.nueva(M), { background: true });
  assert.deepEqual(keys(tabs), [rutas.nueva(M), rutas.generado(M, "g1")]);
});

test("tope de MAX_TABS descarta la no activa menos usada", () => {
  let tabs: Tab[] = [];
  let prev: string | null = null;
  for (let i = 0; i < MAX_TABS; i += 1) {
    const href = rutas.clase(M, `n${i}`);
    tabs = open(tabs, href, prev, { now: 100 + i });
    prev = tabKey(href);
  }
  tabs = tabs.map((tab) => (tab.href === rutas.clase(M, "n0") ? { ...tab, at: 500 } : tab));
  assert.equal(tabs.length, MAX_TABS);
  const next = open(tabs, rutas.apuntes(M), prev, { now: 1000 });
  assert.equal(next.length, MAX_TABS);
  assert.ok(keys(next).includes(rutas.apuntes(M)));
  assert.ok(keys(next).includes(rutas.clase(M, "n0")));
  assert.ok(!keys(next).includes(rutas.clase(M, "n1")));
});

test("tope nunca descarta la activa", () => {
  let tabs: Tab[] = [];
  for (let i = 0; i < MAX_TABS; i += 1) tabs = open(tabs, rutas.clase(M, `n${i}`), null, { now: 100 + i });
  const next = open(tabs, rutas.apuntes(M), null, { now: 1 });
  assert.equal(next.length, MAX_TABS);
  assert.ok(keys(next).includes(rutas.apuntes(M)));
  assert.ok(!keys(next).includes(rutas.clase(M, "n0")));
});

test("closeTab activa la vecina derecha, luego izquierda, luego inicio", () => {
  let tabs = open([], rutas.clases(M), null);
  tabs = open(tabs, rutas.apuntes(M), rutas.clases(M));
  tabs = open(tabs, rutas.calendario(M), rutas.apuntes(M));

  const middle = closeTab(tabs, rutas.apuntes(M), rutas.apuntes(M), M);
  assert.deepEqual(keys(middle.tabs), [rutas.clases(M), rutas.calendario(M)]);
  assert.equal(middle.next, rutas.calendario(M));

  const last = closeTab(tabs, rutas.calendario(M), rutas.calendario(M), M);
  assert.equal(last.next, rutas.apuntes(M));

  const only = closeTab([tabs[0]], rutas.clases(M), rutas.clases(M), M);
  assert.deepEqual(only.tabs, []);
  assert.equal(only.next, rutas.materia(M));
});

test("closeTab de una no activa no navega", () => {
  let tabs = open([], rutas.clases(M), null);
  tabs = open(tabs, rutas.apuntes(M), rutas.clases(M));
  const result = closeTab(tabs, rutas.clases(M), rutas.apuntes(M), M);
  assert.deepEqual(keys(result.tabs), [rutas.apuntes(M)]);
  assert.equal(result.next, null);
});

test("closeTab devuelve el href guardado de la vecina", () => {
  let tabs = open([], rutas.clase(M, "a"), null);
  tabs = open(tabs, rutas.apuntes(M, { tipo: "generados" }), rutas.clase(M, "a"));
  const result = closeTab(tabs, rutas.clase(M, "a"), rutas.clase(M, "a"), M);
  assert.equal(result.next, `${base}/apuntes?tipo=generados`);
});

test("closeTab no cierra inicio", () => {
  const tabs = open([], rutas.clases(M), null);
  const result = closeTab(tabs, base, base, M);
  assert.equal(result.tabs, tabs);
  assert.equal(result.next, null);
});

test("setTabTitle conserva la referencia si no cambia", () => {
  const tabs = open([], rutas.archivo(M, "f1"), null);
  assert.equal(setTabTitle(tabs, rutas.archivo(M, "f1"), "Archivo"), tabs);
  const renamed = setTabTitle(tabs, rutas.archivo(M, "f1"), "apunte.pdf", "pdf");
  assert.notEqual(renamed, tabs);
  assert.equal(renamed[0].title, "apunte.pdf");
  assert.equal(renamed[0].icon, "pdf");
  assert.equal(setTabTitle(renamed, rutas.archivo(M, "f1"), "apunte.pdf"), renamed);
  assert.equal(setTabTitle(renamed, rutas.clases(M), "x"), renamed);
});

test("markSeen limpia unread", () => {
  const tabs = open([], rutas.generado(M, "g"), null, { background: true });
  const seen = markSeen(tabs, rutas.generado(M, "g"));
  assert.equal(seen[0].unread, undefined);
  assert.equal(markSeen(seen, rutas.generado(M, "g")), seen);
});

test("moveTab reordena con límites", () => {
  let tabs = open([], rutas.clases(M), null);
  tabs = open(tabs, rutas.apuntes(M), null);
  tabs = open(tabs, rutas.calendario(M), null);
  assert.deepEqual(keys(moveTab(tabs, rutas.calendario(M), 0)), [rutas.calendario(M), rutas.clases(M), rutas.apuntes(M)]);
  assert.deepEqual(keys(moveTab(tabs, rutas.clases(M), 99)), [rutas.apuntes(M), rutas.calendario(M), rutas.clases(M)]);
  assert.equal(moveTab(tabs, rutas.clases(M), 0), tabs);
});
