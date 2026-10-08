#!/usr/bin/env node
/**
 * Drive the class editor (Fase B, B1) in Chromium against a local origin.
 *   node bin/drive-clase-editor.mjs --base-url http://127.0.0.1:PORT \
 *     --user-data-dir /tmp/arquimes-verify-…/profile --evidence artifacts/verify-arquimes
 * If the profile has no session it registers a throwaway verify-clase-editor-…@example.test user.
 * Covers: live render of heading, task, inline and block math; task toggle; autosave PATCH body;
 * reload keeps the content; pasted Markdown table; flush on unmount when switching tabs 300 ms
 * after typing; list row and delete with confirmation.
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
    headed: { type: "boolean" },
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
  headless: !values.headed,
  viewport: { width: 1440, height: 900 },
});
const page = context.pages()[0] || (await context.newPage());
page.setDefaultNavigationTimeout(90000);
page.setDefaultTimeout(30000);
const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

async function fail(message) {
  await snap("fallo").catch(() => undefined);
  if (consoleErrors.length) console.error(consoleErrors.join("\n"));
  throw new Error(`drive-clase-editor: ${message}`);
}

async function snap(name) {
  writeFileSync(`${evidence}/clase-editor-${name}.html`, await page.content());
  await page.screenshot({ path: `${evidence}/clase-editor-${name}.png` });
}

async function api(method, path, data) {
  const response = await page.request.fetch(baseUrl + path, { method, data });
  if (!response.ok()) await fail(`${method} ${path} -> ${response.status()}`);
  return response.json();
}

async function ensureSession() {
  const session = await page.request.get(baseUrl + "/api/auth/get-session");
  const payload = session.ok() ? await session.json().catch(() => null) : null;
  if (payload?.user?.id) return;
  const email = `verify-clase-editor-${suffix}@example.test`;
  const response = await page.request.post(baseUrl + "/api/auth/sign-up/email", {
    data: { email, password: `Verify-${suffix}-${randomBytes(6).toString("hex")}`, name: "Verify Editor" },
    headers: { origin: baseUrl },
  });
  if (!response.ok()) await fail(`sign-up failed: ${response.status()} ${await response.text()}`);
  console.log("drive-clase-editor: registered", email);
}

const patches = [];
page.on("request", (request) => {
  if (request.method() === "PATCH" && /\/api\/notas\/[^/]+$/.test(new URL(request.url()).pathname)) {
    try {
      patches.push(JSON.parse(request.postData() || "{}"));
    } catch {
      patches.push({});
    }
  }
});

const editor = () => page.locator(".arq-editor .ProseMirror");

async function waitSaved(label) {
  await page
    .waitForFunction(
      () => document.querySelector("[data-save-state=guardado]")?.textContent?.trim() === "Guardado",
      undefined,
      { timeout: 10000 }
    )
    .catch(async () => await fail(`${label}: «Guardado» never appeared`));
}

async function placeCursorAtEnd() {
  await editor().evaluate((node) => {
    node.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

await page.goto(baseUrl + "/login", { waitUntil: "domcontentloaded" });
await ensureSession();

const materia = await api("POST", "/api/materias", { name: `Editor ${suffix}` });
const m = `/materias/${materia.id}`;
const clase = await api("POST", `/api/materias/${materia.id}/notas`, { titulo: "", contenido: "" });
if (!/^Clase \d+$/.test(clase.titulo)) await fail(`empty title should become «Clase N», got «${clase.titulo}»`);

await page.goto(baseUrl + `${m}/clases`, { waitUntil: "domcontentloaded" });
await page.getByRole("link", { name: new RegExp(clase.titulo) }).first().waitFor({ timeout: 20000 });
await snap("lista");

await page.goto(baseUrl + `${m}/clases/${clase.id}`, { waitUntil: "domcontentloaded" });
await editor().waitFor({ timeout: 90000 }).catch(async () => await fail("the editor did not load"));
const focused = await editor().evaluate((node) => node === document.activeElement || node.contains(document.activeElement));
if (!focused) await fail("an empty class should focus the editor body");

await page.keyboard.type("## Hola");
await page.keyboard.press("Enter");
await page.keyboard.type("- [ ] tarea");
await page.keyboard.press("Enter");
await page.keyboard.press("Enter");
await page.keyboard.type("Energía $x^2$ ");
await page.keyboard.press("Enter");
await page.keyboard.type("$$");
await page.keyboard.press("Enter");
await page.keyboard.type("\\int x");
await page.waitForTimeout(300);

if (!(await editor().locator("h2", { hasText: "Hola" }).count())) await fail("## Hola should render as h2");
if (!(await page.locator(".arq-editor .milkdown-list-item-block .label-wrapper .unchecked").count())) {
  await fail("- [ ] should render an unchecked task");
}
if (!(await editor().locator('span[data-type="math_inline"] .katex').count())) await fail("$x^2$ should render with KaTeX");
await snap("escrito");

await page.locator(".arq-editor .milkdown-list-item-block .label-wrapper .unchecked").first().dispatchEvent("pointerdown");
await page.locator(".arq-editor .milkdown-list-item-block .label-wrapper .checked").first().waitFor({ timeout: 5000 });

await waitSaved("after typing");
const last = patches.at(-1)?.contenido ?? "";
for (const fragment of ["## Hola", "- [x] tarea", "$x^2$"]) {
  if (!last.includes(fragment)) await fail(`PATCH contenido should include ${fragment}, got ${JSON.stringify(last)}`);
}
if (!/(^|\n)\$\$\n[\s\S]*\\int x[\s\S]*\n\$\$(\n|$)/.test(last)) {
  await fail(`PATCH contenido should keep a $$ block on its own lines, got ${JSON.stringify(last)}`);
}
await snap("guardado");

await page.reload({ waitUntil: "domcontentloaded" });
await editor().waitFor({ timeout: 90000 }).catch(async () => await fail("the editor did not load"));
if (!(await editor().locator("h2", { hasText: "Hola" }).count())) await fail("h2 missing after reload");
if (!(await page.locator(".arq-editor .milkdown-list-item-block .label-wrapper .checked").count())) {
  await fail("checked task missing after reload");
}
if (!(await page.locator(".arq-editor .katex").count())) await fail("math missing after reload");
await snap("recargado");

await placeCursorAtEnd();
await page.keyboard.press("Enter");
await editor().evaluate((node) => {
  const data = new DataTransfer();
  data.setData("text/plain", "| a | b |\n| - | - |\n| 1 | 2 |");
  node.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
});
await page.locator(".arq-editor table").first().waitFor({ timeout: 5000 }).catch(async () => await fail("pasted table did not render"));
await waitSaved("after paste");
await snap("tabla");

const marker = `flush-${suffix}`;
await placeCursorAtEnd();
await page.keyboard.press("Enter");
await page.keyboard.type(marker);
await page.waitForTimeout(300);
await page.locator(`[data-arq-tabbar] [data-tab-key="${m}/clases"] a`).click();
await page.waitForURL(new RegExp(`${m}/clases$`), { timeout: 10000 });
let saved = "";
for (let attempt = 0; attempt < 20; attempt += 1) {
  saved = (await api("GET", `/api/notas/${clase.id}`)).contenido;
  if (saved.includes(marker)) break;
  await page.waitForTimeout(250);
}
if (!saved.includes(marker)) await fail(`switching tabs 300 ms after typing lost the edit: ${JSON.stringify(saved)}`);

await page.goto(baseUrl + `${m}/clases/${clase.id}`, { waitUntil: "domcontentloaded" });
await editor().waitFor({ timeout: 90000 }).catch(async () => await fail("the editor did not load"));
const titulo = page.getByLabel("Título de la clase");
await titulo.fill(`Clase editada ${suffix}`);
await titulo.press("Enter");
const bodyFocused = await editor().evaluate((node) => node === document.activeElement || node.contains(document.activeElement));
if (!bodyFocused) await fail("Enter in the title should move focus to the body");
await page.keyboard.press("Control+s");
await waitSaved("after Ctrl+S");
if ((await api("GET", `/api/notas/${clase.id}`)).titulo !== `Clase editada ${suffix}`) await fail("Ctrl+S did not save the title");

await page.getByRole("button", { name: "Más opciones" }).click();
await page.getByRole("menuitem", { name: "Borrar" }).click();
await page.getByRole("dialog").getByText(`¿Borrar «Clase editada ${suffix}»?`).waitFor();
await snap("confirmar-borrar");
await page.getByRole("dialog").getByRole("button", { name: "Borrar" }).click();
await page.waitForURL((url) => !url.pathname.endsWith(`/clases/${clase.id}`), { timeout: 10000 });
const gone = await page.request.get(`${baseUrl}/api/notas/${clase.id}`);
if (gone.status() !== 404) await fail(`deleted class should 404, got ${gone.status()}`);
if (await page.locator(`[data-arq-tabbar] [data-tab-key="${m}/clases/${clase.id}"]`).count()) {
  await fail("the deleted class tab should be closed");
}

await page.goto(baseUrl + `${m}/clases`, { waitUntil: "domcontentloaded" });
await page.getByText("Todavía no tenés clases anotadas.").waitFor({ timeout: 10000 });
await snap("vacia");

await api("DELETE", `/api/materias/${materia.id}`);

const relevant = consoleErrors.filter((text) => !/favicon|Download the React DevTools/i.test(text));
if (relevant.length) console.warn("drive-clase-editor: console errors\n" + relevant.join("\n"));

await context.close();
console.log("drive-clase-editor ok:", materia.id);
