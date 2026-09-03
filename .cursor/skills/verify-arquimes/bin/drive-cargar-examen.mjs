#!/usr/bin/env node
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
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
  console.error("missing args");
  process.exit(1);
}
if (baseUrl.includes("vercel.app")) {
  console.error("refuse production");
  process.exit(1);
}

mkdirSync(evidence, { recursive: true });

const materiaName = "Álgebra lineal";
const note = "Parcial 2023";
const pdfName = "parcial-2023.pdf";
const pdfPath = `${evidence}/${pdfName}`;
writeFileSync(pdfPath, Buffer.alloc(69, 0x20));

function formAlert(page) {
  return page.locator("p[role='alert']");
}

function assertNo(html, pattern, label) {
  if (pattern.test(html)) {
    throw new Error(`unexpected ${label}`);
  }
}

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  viewport: { width: 1280, height: 800 },
});
const page = context.pages()[0] || (await context.newPage());

await page.goto(baseUrl + "/materias/nueva", { waitUntil: "networkidle" });
await page.getByLabel("Nombre de la materia").fill(materiaName);
await page.getByRole("button", { name: "Crear materia" }).click();
await page.waitForURL(/\/materias\/[0-9a-f-]+$/i, { timeout: 20000 });
await page.getByRole("heading", { name: materiaName }).waitFor();
const materiaId = page.url().split("/materias/")[1];

await page.getByRole("link", { name: /Cargar examen/ }).click();
await page.waitForURL(/\/examen$/);
await page.getByRole("heading", { name: "Cargar examen" }).waitFor();

const formHtml = await page.content();
writeFileSync(`${evidence}/cargar-examen-form.html`, formHtml);
await page.screenshot({ path: `${evidence}/cargar-examen-form.png` });

assertNo(formHtml, /Paso 1 de 3/i, "fake exam wizard");
assertNo(formHtml, /Derivadas|Integrales/, "hardcoded calculus temas");
assertNo(formHtml, /Modalidad/, "modalidad field");
assertNo(formHtml, /Objetivo personal/, "objetivo essay");
assertNo(formHtml, /Fecha del examen/, "fecha blocker");

const fileInput = page.getByLabel("Archivo del examen");
if ((await fileInput.count()) < 1) {
  throw new Error("Cargar examen has no file input");
}

await page.getByRole("button", { name: "Guardar examen" }).click();
await formAlert(page).waitFor();
const missing = await formAlert(page).innerText();
if (!missing.toLowerCase().includes("archivo")) {
  throw new Error(`expected file alert, got: ${missing}`);
}
if (!page.url().includes("/examen")) {
  throw new Error("missing-file submit must stay on the form");
}

await fileInput.setInputFiles(pdfPath);
await page.getByText("69 B").waitFor();
await page.getByLabel("De qué trata").fill(note);
await page.getByRole("button", { name: "Guardar examen" }).click();
await page.waitForURL(/\/examenes$/, { timeout: 20000 });
await page.reload({ waitUntil: "networkidle" });

const listHtml = await page.content();
writeFileSync(`${evidence}/cargar-examen-list.html`, listHtml);
await page.screenshot({ path: `${evidence}/cargar-examen-list.png` });
if (!listHtml.includes(note) || !listHtml.includes(pdfName)) {
  throw new Error("examenes list missing note or filename after reload");
}
if (listHtml.includes("0 KB")) {
  throw new Error("tiny exam PDF shown as 0 KB");
}

await page.getByRole("link", { name: note }).click();
await page.waitForURL(/\/examenes\/[0-9a-f-]+$/i);
await page.getByRole("heading", { name: note }).waitFor();
const detailHtml = await page.content();
writeFileSync(`${evidence}/cargar-examen-detail.html`, detailHtml);
if (!detailHtml.includes(pdfName) || !detailHtml.includes("Descargar archivo")) {
  throw new Error("detail missing file or download");
}

const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("link", { name: /Descargar archivo/ }).click(),
]);
const downloaded = await download.path();
if (!downloaded || statSync(downloaded).size !== 69) {
  throw new Error("downloaded exam file is not the 69-byte original");
}
writeFileSync(
  `${evidence}/cargar-examen-downloaded.pdf`,
  readFileSync(downloaded)
);

await page.reload({ waitUntil: "networkidle" });
const detailAgain = await page.content();
writeFileSync(`${evidence}/cargar-examen-detail-reload.html`, detailAgain);
if (!detailAgain.includes(pdfName)) {
  throw new Error("file missing on detail after reload");
}

await page.goto(`${baseUrl}/materias/${materiaId}/examenes`, {
  waitUntil: "networkidle",
});
const listAgain = await page.content();
writeFileSync(`${evidence}/cargar-examen-list-reopen.html`, listAgain);
if (!listAgain.includes(note) || !listAgain.includes(pdfName)) {
  throw new Error("reopening the list lost the exam file");
}

await context.close();
console.log("drive-cargar-examen ok");
