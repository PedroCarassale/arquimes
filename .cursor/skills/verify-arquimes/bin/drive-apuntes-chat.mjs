#!/usr/bin/env node
/**
 * Drive Apuntes + chat (Fase B, B3) in Chromium against a local origin served with mock-openai.mjs.
 *   node bin/drive-apuntes-chat.mjs --base-url http://127.0.0.1:PORT \
 *     --user-data-dir /tmp/arquimes-verify-…/profile --evidence artifacts/verify-arquimes
 * Covers: empty Apuntes drop box, PDF upload through the queue until «Listo para el chat»,
 * filters (Todos · Archivos · Pergaminos) in the URL, grounded chat answer with a citation chip that
 * links to the file, «Copiar» writes raw Markdown, «Guardar en apuntes» opens a background tab and
 * the saved document shows under Apuntes › Pergaminos, opens read-only, and can be deleted.
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

const suffix = randomBytes(3).toString("hex");
const fileName = `teoria-errores-${suffix}.pdf`;
const filePath = `${evidence}/${fileName}`;
const question = "Necesito aprender todo el apunte. Mapeá los temas y empecemos por el primero.";
const savedTitle = "Mapa del apunte";
const filler = (label) =>
  Array.from({ length: 55 }, (_, i) => `${label} ${i + 1}. Ejercicios y observaciones de medición numérica.`);
const fileBody = [
  "UNIDAD 1 - TEORIA DE ERRORES",
  "Valor exacto alpha y valor aproximado a. ARQUIMES-VALOR-APROXIMADO.",
  ...filler("Notas iniciales"),
  "ERROR ABSOLUTO",
  "Delta(a)=abs(alpha-a). ARQUIMES-ERROR-ABSOLUTO.",
  ...filler("Ejemplos absolutos"),
  "ERROR RELATIVO",
  "epsilon(a)=Delta(a)/abs(alpha). ARQUIMES-ERROR-RELATIVO.",
  ...filler("Ejemplos relativos"),
  "ERROR PORCENTUAL",
  "porcentaje=epsilon(a)*100. ARQUIMES-ERROR-PORCENTUAL.",
].join("\n");

function escapePdfText(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ");
}

function writePdfWithText(path, text) {
  const lines = text.split("\n").slice(0, 360);
  const pages = [];
  for (let start = 0; start < lines.length; start += 48) pages.push(lines.slice(start, start + 48));
  const pageIds = pages.map((_, index) => 4 + index * 2);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (let index = 0; index < pages.length; index += 1) {
    const contentId = pageIds[index] + 1;
    const ops = ["BT", "/F1 10 Tf", "44 800 Td", "15 TL", ...pages[index].map((line) => `(${escapePdfText(line)}) Tj T*`), "ET", ""].join("\n");
    const stream = Buffer.from(ops, "latin1");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream.toString("latin1")}endstream`
    );
  }
  let body = "";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(body.length + "%PDF-1.4\n".length);
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = "%PDF-1.4\n".length + body.length;
  const xref = offsets
    .map((offset, index) => (index === 0 ? "0000000000 65535 f " : `${String(offset).padStart(10, "0")} 00000 n `))
    .join("\n");
  const trailer = `xref\n0 ${objects.length + 1}\n${xref}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  writeFileSync(path, `%PDF-1.4\n${body}${trailer}`, "latin1");
}

writePdfWithText(filePath, fileBody);

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  viewport: { width: 1440, height: 900 },
});
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseUrl).origin });
const page = context.pages()[0] || (await context.newPage());

function fail(message) {
  throw new Error(`drive-apuntes-chat: ${message}`);
}

async function snap(name) {
  writeFileSync(`${evidence}/apuntes-chat-${name}.html`, await page.content());
  await page.screenshot({ path: `${evidence}/apuntes-chat-${name}.png` });
}

async function api(method, path, data) {
  const response = await page.request.fetch(baseUrl + path, { method, data });
  if (!response.ok()) fail(`${method} ${path} -> ${response.status()}`);
  return response.json();
}

const row = (text) => page.locator("main li").filter({ hasText: text });
const chat = () => page.locator("[data-arq-chat]");

await page.goto(baseUrl + "/", { waitUntil: "networkidle" });
const materia = await api("POST", "/api/materias", { name: `Apuntes ${suffix}` });
const m = `/materias/${materia.id}`;

await page.goto(baseUrl + `${m}/apuntes`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Apuntes", exact: true }).waitFor({ timeout: 20000 });
await page.getByText("Arrastrá PDFs, fotos o apuntes, o elegí archivos").waitFor();
await page.getByText("El chat va a poder estudiar con esto.").waitFor();
await snap("vacio");

await page.locator('input[type="file"][aria-label="Elegir archivos"]').setInputFiles(filePath);
await row(fileName).first().waitFor({ timeout: 60000 });
if (!(await row(fileName).first().locator(`a[href*="${m}/apuntes/archivo/"]`).count())) fail("file row should link to rutas.archivo");
await row(fileName).first().getByText("Listo para el chat").waitFor({ timeout: 120000 }).catch(async () => {
  await snap("lectura-timeout");
  fail(`«${fileName}» never reached «Listo para el chat»`);
});
const metaText = (await row(fileName).first().textContent()) || "";
if (!/PDF · .+ · \d{1,2} [a-z]{3}/.test(metaText)) fail(`unexpected file meta: ${metaText}`);
await snap("pdf-listo");

await page.getByRole("radio", { name: "Pergaminos" }).click();
await page.waitForFunction(() => new URL(location.href).searchParams.get("tipo") === "generados");
await page.getByText("Todavía no guardaste nada del chat.").waitFor();
await page.getByRole("radio", { name: "Todos" }).click();
await page.waitForFunction(() => !new URL(location.href).searchParams.has("tipo"));

const composer = chat().getByLabel("Escribí un mensaje");
await composer.waitFor({ timeout: 10000 });
const chatResponse = page.waitForResponse(
  (res) => res.url().includes("/api/chat") && res.request().method() === "POST",
  { timeout: 60000 }
);
await composer.fill(question);
await chat().getByRole("button", { name: "Enviar mensaje" }).click();
await chat().locator('[data-chat-role="user"]').filter({ hasText: question }).waitFor();
const response = await chatResponse;
if (response.status() >= 400) fail(`POST /api/chat -> ${response.status()}`);
await chat().locator('[data-chat-thinking="true"]').waitFor({ state: "detached", timeout: 60000 });
const answer = chat().locator('[data-chat-role="assistant"]').last();
await answer.getByText(savedTitle).first().waitFor({ timeout: 20000 });
const citation = answer.locator(`a[href*="${m}/apuntes/archivo/"]`);
if (!(await citation.count())) fail("assistant citation should link to the uploaded file with rutas.archivo");
await snap("respuesta");

await answer.hover();
await answer.getByRole("button", { name: "Copiar" }).click();
const copied = await page.evaluate(() => navigator.clipboard.readText());
if (!copied.includes(`## ${savedTitle}`) || copied.includes("ARQUIMES_CITATIONS")) fail("«Copiar» should write the raw Markdown without the citations marker");

const saveResponse = page.waitForResponse(
  (res) => res.url().endsWith(`/api/materias/${materia.id}/artefactos`) && res.request().method() === "POST",
  { timeout: 20000 }
);
await answer.hover();
await answer.getByRole("button", { name: "Guardar en apuntes" }).click();
const saved = await saveResponse;
if (saved.status() !== 201) fail(`POST artefactos -> ${saved.status()}`);
const creado = await saved.json();
if (creado.tipo !== "documento" || creado.titulo !== savedTitle) fail(`unexpected ArtefactoCreado ${JSON.stringify(creado)}`);
await page.getByText("Guardado en Apuntes", { exact: true }).first().waitFor({ timeout: 5000 });
const generadoHref = `${m}/apuntes/generado/${creado.id}`;
await page.locator(`[data-arq-tabbar] [data-tab-key="${generadoHref}"]`).waitFor({ timeout: 5000 }).catch(() =>
  fail("«Guardar en apuntes» should open the document in a background tab")
);
if (new URL(page.url()).pathname !== `${m}/apuntes`) fail("«Guardar en apuntes» must not navigate");
await row(savedTitle).first().waitFor({ timeout: 10000 }).catch(() => fail("saved document should appear in the open Apuntes list"));
await snap("guardado");

await page.goto(baseUrl + `${m}/apuntes?tipo=generados`, { waitUntil: "networkidle" });
await row(savedTitle).first().waitFor({ timeout: 10000 });
if (!/Pergamino · v1/.test((await row(savedTitle).first().textContent()) || "")) fail("generated row should read «Pergamino · v1 · …»");
if (await row(fileName).count()) fail("Pergaminos filter should hide files");
await snap("del-chat");

await page.getByRole("radio", { name: "Archivos" }).click();
await row(fileName).first().waitFor();
if (await row(savedTitle).count()) fail("Archivos filter should hide generated documents");
await page.getByRole("radio", { name: "Todos" }).click();

await row(savedTitle).first().locator("a").first().click();
await page.waitForURL(new RegExp(`${generadoHref}$`), { timeout: 20000 });
await page.locator("main").getByText("Pergamino").waitFor();
await page.locator("main .doc-markdown").getByRole("heading", { name: savedTitle }).waitFor();
if (await page.locator("main").getByText("Guardar en mi preparación").count()) fail("preparation copy is back");
await snap("generado");

await page.goto(baseUrl + `${m}/apuntes`, { waitUntil: "networkidle" });
await row(savedTitle).first().hover();
await row(savedTitle).first().getByRole("button", { name: "Más acciones" }).click();
await page.getByRole("menuitem", { name: "Borrar" }).click();
await page.getByRole("dialog").getByText(`¿Borrar «${savedTitle}»?`).waitFor();
await page.getByRole("dialog").getByRole("button", { name: "Borrar" }).click();
await row(savedTitle).first().waitFor({ state: "detached", timeout: 10000 });
if (await page.locator(`[data-arq-tabbar] [data-tab-key="${generadoHref}"]`).count()) fail("deleting should close the document tab");
await snap("borrado");

const html = await page.content();
if (/preparaci[oó]n estimada|¿Qué tan preparado|Próximamente/i.test(html)) fail("forbidden copy rendered");

await context.close();
console.log(`drive-apuntes-chat ok ${materia.id} ${fileName}`);
