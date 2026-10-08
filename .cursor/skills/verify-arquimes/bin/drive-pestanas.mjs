#!/usr/bin/env node
/**
 * Drive the materia tab strip (Fase A, A2) in Chromium against a local origin.
 *   node bin/drive-pestanas.mjs --base-url http://127.0.0.1:PORT \
 *     --user-data-dir /tmp/arquimes-verify-…/profile --evidence artifacts/verify-arquimes
 * Covers: tabs open per URL, restore after reload, close active -> right neighbour,
 * "+" opens Pestaña nueva and the launcher replaces it, Ctrl+K overlay with
 * "Preguntarle al chat", legacy redirects, 404 closes its tab with a toast, mobile selector.
 */
import { chromium } from "playwright";
import { randomBytes, randomUUID } from "node:crypto";
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

const suffix = randomBytes(3).toString("hex");
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  viewport: { width: 1440, height: 900 },
});
const page = context.pages()[0] || (await context.newPage());

function fail(message) {
  throw new Error(`drive-pestanas: ${message}`);
}

async function snap(name) {
  writeFileSync(`${evidence}/pestanas-${name}.html`, await page.content());
  await page.screenshot({ path: `${evidence}/pestanas-${name}.png` });
}

async function api(method, path, data) {
  const response = await page.request.fetch(baseUrl + path, { method, data });
  if (!response.ok()) fail(`${method} ${path} -> ${response.status()}`);
  return response.json();
}

const strip = () => page.locator("[data-arq-tabbar]");
const tabKeys = () =>
  strip()
    .locator("[data-tab-key]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-tab-key")));
const activeKey = () => strip().locator("[data-tab-key][data-active]").getAttribute("data-tab-key");

async function expectKeys(expected, label) {
  await page.waitForFunction(
    (want) =>
      JSON.stringify(
        Array.from(document.querySelectorAll("[data-arq-tabbar] [data-tab-key]")).map((n) => n.getAttribute("data-tab-key"))
      ) === JSON.stringify(want),
    expected,
    { timeout: 10000 }
  ).catch(async () => fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(await tabKeys())}`));
}

await page.goto(baseUrl + "/", { waitUntil: "networkidle" });

const materia = await api("POST", "/api/materias", { name: `Pestañas ${suffix}` });
const m = `/materias/${materia.id}`;
const claseA = await api("POST", `/api/materias/${materia.id}/notas`, { titulo: `Clase A ${suffix}`, contenido: "" });

await page.goto(baseUrl + m, { waitUntil: "networkidle" });
await strip().waitFor({ timeout: 20000 });
if (!(await strip().locator("[data-tab-home][aria-current=page]").count())) fail("Inicio tab should be active on the materia home");

await page.goto(baseUrl + `${m}/clases`, { waitUntil: "networkidle" });
await page.goto(baseUrl + `${m}/clases/${claseA.id}`, { waitUntil: "networkidle" });
await page.goto(baseUrl + `${m}/apuntes?tipo=archivos`, { waitUntil: "networkidle" });
const opened = [`${m}/clases`, `${m}/clases/${claseA.id}`, `${m}/apuntes`];
await expectKeys(opened, "after opening three tabs");
await snap("tres-abiertas");

await page.reload({ waitUntil: "networkidle" });
await expectKeys(opened, "after reload");
if ((await activeKey()) !== `${m}/apuntes`) fail("Apuntes should stay active after reload");

await strip().locator(`[data-tab-key="${m}/clases"] a`).click();
await page.waitForURL(new RegExp(`${m}/clases$`));
if ((await activeKey()) !== `${m}/clases`) fail("clicking a tab should activate it");

await strip().locator(`[data-tab-key="${m}/clases"] button[aria-label^="Cerrar"]`).click();
await page.waitForURL(new RegExp(`${m}/clases/${claseA.id}$`), { timeout: 10000 });
await expectKeys([`${m}/clases/${claseA.id}`, `${m}/apuntes`], "after closing the active tab");
await snap("cerrada-activa");

await strip().getByRole("button", { name: "Pestaña nueva" }).click();
await page.waitForURL(new RegExp(`${m}/nueva$`));
await expectKeys([`${m}/clases/${claseA.id}`, `${m}/nueva`, `${m}/apuntes`], "after +");
await page.getByPlaceholder("Buscá una clase, un apunte o una fecha…").waitFor();
await snap("lanzador-pestana");
await page.getByRole("option", { name: "Calendario" }).first().click();
await page.waitForURL(new RegExp(`${m}/calendario$`));
await expectKeys([`${m}/clases/${claseA.id}`, `${m}/calendario`, `${m}/apuntes`], "launcher should replace Pestaña nueva");

await page.keyboard.press("Control+k");
const overlay = page.locator("[data-arq-launcher]");
await overlay.waitFor({ timeout: 5000 });
await overlay.getByRole("combobox").fill(`hola ${suffix}`);
await overlay.getByRole("option", { name: `Preguntarle al chat: «hola ${suffix}»` }).waitFor();
await snap("lanzador-overlay");
await page.keyboard.press("Escape");
await overlay.waitFor({ state: "detached", timeout: 5000 });

await page.keyboard.press("Alt+w");
await page.waitForURL(new RegExp(`${m}/apuntes(\\?.*)?$`), { timeout: 10000 });
await expectKeys([`${m}/clases/${claseA.id}`, `${m}/apuntes`], "after Alt+W");

for (const [from, to] of [
  [`${m}/notas`, `${m}/clases`],
  [`${m}/notas/${claseA.id}?a=1`, `${m}/clases/${claseA.id}?a=1`],
  [`${m}/generados`, `${m}/apuntes?tipo=generados`],
  [`${m}/examenes`, `${m}/calendario`],
  [`${m}/practica`, m],
]) {
  await page.goto(baseUrl + from, { waitUntil: "domcontentloaded" });
  const url = new URL(page.url());
  if (url.pathname + url.search !== to) fail(`redirect ${from} -> expected ${to}, got ${url.pathname + url.search}`);
}

const ghost = `${m}/clases/${randomUUID()}`;
await page.goto(baseUrl + ghost, { waitUntil: "networkidle" });
await page.getByText("Esa clase ya no existe", { exact: true }).first().waitFor({ timeout: 10000 });
await page.waitForFunction((path) => location.pathname !== path, ghost, { timeout: 10000 });
if ((await tabKeys()).includes(ghost)) fail("404 tab should be closed");
await snap("404-cerrada");

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseUrl + `${m}/apuntes`, { waitUntil: "networkidle" });
const selector = page.getByRole("button", { name: /^Pestaña actual: Apuntes\./ });
await selector.waitFor({ timeout: 10000 });
await selector.click();
await page.getByRole("dialog", { name: "Pestañas" }).getByText("Pestaña nueva").waitFor();
await snap("mobile-selector");

await context.close();
console.log("drive-pestanas ok:", materia.id);
