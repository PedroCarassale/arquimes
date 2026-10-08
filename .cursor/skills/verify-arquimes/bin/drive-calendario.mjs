#!/usr/bin/env node
/**
 * Drive the calendar (Fase B, B2) in Chromium against a local origin.
 *   node bin/drive-calendario.mjs --base-url http://127.0.0.1:PORT \
 *     --user-data-dir /tmp/arquimes-verify-…/profile --evidence artifacts/verify-arquimes
 * Covers: quick create with hora from the materia calendar, the event shows in the grid/agenda,
 * ?nuevo=1 opens the popover and is stripped from the URL, event page (hora in the meta line,
 * temas chips, autosaved description), the event in /calendario with its preview popover,
 * mobile agenda by default, and deleting the event closes its tab.
 */
import { chromium } from "playwright";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "base-url": { type: "string" },
    "user-data-dir": { type: "string" },
    evidence: { type: "string" },
  },
});

const baseUrl = values["base-url"];
const userDataDir = values["user-data-dir"];
const evidence = values.evidence;

if (!baseUrl || !userDataDir || !evidence) {
  console.error("missing --base-url --user-data-dir --evidence");
  process.exit(1);
}
if (baseUrl.includes("vercel.app")) {
  console.error("refuse production");
  process.exit(1);
}

mkdirSync(evidence, { recursive: true });

function hoyYmd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function sumarDias(ymd, n) {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

const suffix = randomBytes(3).toString("hex");
const hoy = hoyYmd();
const fecha = sumarDias(hoy, 7);
const nombre = `Primer parcial ${suffix}`;

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  viewport: { width: 1440, height: 900 },
});
const page = context.pages()[0] || (await context.newPage());

function fail(message) {
  throw new Error(`drive-calendario: ${message}`);
}

async function snap(name) {
  writeFileSync(`${evidence}/calendario-${name}.html`, await page.content());
  await page.screenshot({ path: `${evidence}/calendario-${name}.png` });
}

async function api(method, path, data) {
  const response = await page.request.fetch(baseUrl + path, { method, data });
  if (!response.ok()) fail(`${method} ${path} -> ${response.status()}`);
  return response.json();
}

await page.goto(baseUrl + "/", { waitUntil: "networkidle" });
const materia = await api("POST", "/api/materias", { name: `Calendario ${suffix}` });
const m = `/materias/${materia.id}`;

await page.goto(baseUrl + `${m}/calendario`, { waitUntil: "networkidle" });
await page.getByRole("radiogroup", { name: "Vista del calendario" }).waitFor({ timeout: 20000 });
if ((await page.locator("[data-cell][data-today]").count()) !== 1) fail("today should be marked once in the month grid");
await snap("vacio");

await page.getByRole("button", { name: "Nuevo evento", exact: true }).click();
const popover = page.getByRole("dialog", { name: "Nuevo evento" });
await popover.waitFor({ timeout: 5000 });
await popover.getByLabel("Nombre").fill(nombre);
await popover.getByLabel("Fecha").fill(fecha);
await popover.getByLabel("Hora").fill("18");
await snap("crear");
await popover.getByLabel("Nombre").press("Enter");
await popover.waitFor({ state: "detached", timeout: 10000 });

const agendaLink = page.locator("aside").getByRole("link", { name: new RegExp(nombre) });
await agendaLink.waitFor({ timeout: 15000 });
if (!(await agendaLink.innerText()).includes("18:00")) fail("agenda row should show the normalized hora 18:00");
const cell = page.locator(`[data-cell="${fecha}"]`);
if (await cell.count()) {
  const chip = cell.getByRole("link", { name: new RegExp(nombre) });
  await chip.waitFor({ timeout: 5000 });
  if (!(await chip.innerText()).includes("18:00")) fail("grid chip should be prefixed with 18:00");
}
await snap("con-evento");

const eventos = await api("GET", `/api/materias/${materia.id}/eventos?desde=${hoy}&hasta=${sumarDias(hoy, 30)}`);
const creado = eventos.find((evento) => evento.name === nombre);
if (!creado) fail("created event not returned by the eventos API");
if (creado.hora !== "18:00" || creado.date !== fecha || creado.kind !== "examen") {
  fail(`unexpected event payload ${JSON.stringify(creado)}`);
}

await page.goto(baseUrl + `${m}/calendario?nuevo=1&fecha=${fecha}`, { waitUntil: "networkidle" });
await page.getByRole("dialog", { name: "Nuevo evento" }).waitFor({ timeout: 10000 });
await page.waitForFunction(() => !location.search.includes("nuevo"), null, { timeout: 10000 });
if ((await page.getByRole("dialog", { name: "Nuevo evento" }).getByLabel("Fecha").inputValue()) !== fecha) {
  fail("?fecha= should prefill the quick create date");
}
await page.keyboard.press("Escape");
await page.getByRole("dialog", { name: "Nuevo evento" }).waitFor({ state: "detached", timeout: 5000 });

await page.locator("aside").getByRole("link", { name: new RegExp(nombre) }).click();
await page.waitForURL(new RegExp(`${m}/calendario/${creado.id}$`), { timeout: 15000 });
const nameInput = page.getByLabel("Nombre del evento");
await nameInput.waitFor({ timeout: 10000 });
if ((await nameInput.inputValue()) !== nombre) fail("event page should show the event name");
await page.getByRole("button", { name: "18:00", exact: true }).waitFor({ timeout: 5000 });
await page.getByText("en 7 días", { exact: true }).waitFor({ timeout: 5000 });

const temaInput = page.getByLabel("Agregar tema");
await temaInput.fill("Derivadas");
await temaInput.press("Enter");
await page.getByText("Derivadas", { exact: true }).waitFor({ timeout: 10000 });

const description = page.locator(".ProseMirror, textarea[placeholder^='Anotá qué entra']").first();
await description.click();
await page.keyboard.type(`Entra hasta la unidad 3 ${suffix}`);
await page.getByRole("status").filter({ hasText: "Guardado" }).first().waitFor({ timeout: 15000 });
await snap("evento");

const guardado = await api("GET", `/api/examenes/${creado.id}`);
if (!String(guardado.description || "").includes(`unidad 3 ${suffix}`)) fail("description was not autosaved");
const temas = await api("GET", `/api/examenes/${creado.id}/temas`);
if (!temas.some((tema) => tema.name === "Derivadas")) fail("tema was not saved");

await page.goto(baseUrl + "/calendario", { waitUntil: "networkidle" });
const globalRow = page.locator("aside").getByRole("button", { name: new RegExp(nombre) });
await globalRow.waitFor({ timeout: 15000 });
if (!(await globalRow.innerText()).includes(materia.name)) fail("global agenda row should name the materia");
await globalRow.click();
const preview = page.getByRole("dialog", { name: nombre });
await preview.waitFor({ timeout: 5000 });
await preview.getByText("Derivadas", { exact: true }).waitFor({ timeout: 10000 });
const abrir = preview.getByRole("link", { name: "Abrir en la materia" });
if ((await abrir.getAttribute("href")) !== `${m}/calendario/${creado.id}`) fail("preview should link to the event");
await snap("global");

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseUrl + "/calendario", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Próximas fechas" }).first().waitFor({ timeout: 10000 });
await page.getByRole("button", { name: new RegExp(nombre) }).first().waitFor({ timeout: 10000 });
await snap("mobile-agenda");
await page.setViewportSize({ width: 1440, height: 900 });

await page.goto(baseUrl + `${m}/calendario/${creado.id}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Más acciones" }).click();
await page.getByRole("menuitem", { name: "Borrar" }).click();
await page.getByRole("dialog", { name: `¿Borrar «${nombre}»?` }).getByRole("button", { name: "Borrar" }).click();
await page.waitForFunction((path) => location.pathname !== path, `${m}/calendario/${creado.id}`, { timeout: 10000 });
const despues = await api("GET", `/api/materias/${materia.id}/eventos?desde=${hoy}&hasta=${sumarDias(hoy, 30)}`);
if (despues.some((evento) => evento.id === creado.id)) fail("event should be deleted");

await context.close();
console.log("drive-calendario ok:", materia.id);
