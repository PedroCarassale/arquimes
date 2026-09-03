#!/usr/bin/env node
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
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
const examName = "Parcial 1";
const tema = "Espacios vectoriales";
const objective = "Resolver sin ayuda";
const editedObjective = "Llegar pudiendo rendir sin apuntes.";
const date = "2026-10-15";

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
const materiaUrl = page.url();
const materiaId = materiaUrl.split("/materias/")[1];

await page.getByRole("link", { name: /Cargar examen/ }).click();
await page.waitForURL(/\/examen$/);
await page.getByRole("heading", { name: "Crear examen objetivo" }).waitFor();

const formHtml = await page.content();
writeFileSync(`${evidence}/cargar-examen-form.html`, formHtml);
await page.screenshot({ path: `${evidence}/cargar-examen-form.png` });

assertNo(formHtml, /Paso 1 de 3/i, "fake exam wizard");
assertNo(formHtml, /Derivadas|Integrales/, "hardcoded calculus temas");
assertNo(formHtml, /Cargando/, "materia loading flash");
assertNo(formHtml, /Primer parcial/, "default exam name");

const materiaField = await page.getByLabel("Materia").innerText();
if (!materiaField.includes(materiaName)) {
  throw new Error(`materia field missing ${materiaName}: ${materiaField}`);
}

const nameValue = await page.getByLabel("Nombre del examen").inputValue();
if (nameValue.trim() !== "") {
  throw new Error(`create form should start empty, got "${nameValue}"`);
}

const saveBtn = page.getByRole("button", { name: "Guardar examen" });
if (await saveBtn.isDisabled()) {
  throw new Error("Guardar examen disabled before temas — student sees a dead button");
}

await saveBtn.click();
await page.getByRole("alert").waitFor();
const missingName = await page.getByRole("alert").innerText();
if (!missingName.includes("nombre")) {
  throw new Error(`expected name alert, got: ${missingName}`);
}

await page.getByLabel("Nombre del examen").fill(examName);
await saveBtn.click();
await page.getByRole("alert").waitFor();
const missingDate = await page.getByRole("alert").innerText();
if (!missingDate.includes("fecha")) {
  throw new Error(`expected date alert, got: ${missingDate}`);
}

await page.getByLabel("Fecha del examen").fill(date);
await page.getByLabel("Objetivo personal").fill(objective);
await page.getByLabel("Agregar otro tema").fill(tema);
await page.getByRole("button", { name: "Agregar tema" }).click();
await saveBtn.click();
await page.waitForURL(new RegExp(`/materias/${materiaId}$`), { timeout: 20000 });
await page.reload({ waitUntil: "networkidle" });

const resumenHtml = await page.content();
writeFileSync(`${evidence}/cargar-examen-resumen.html`, resumenHtml);
await page.screenshot({ path: `${evidence}/cargar-examen-resumen.png` });

for (const token of [examName, tema, objective, "Parcial"]) {
  if (!resumenHtml.includes(token)) {
    throw new Error(`resumen missing ${token} after reload`);
  }
}

await page.getByRole("link", { name: "Exámenes", exact: true }).click();
await page.waitForURL(/\/examenes$/);
await page.getByRole("heading", { name: "Exámenes" }).waitFor();
const listHtml = await page.content();
writeFileSync(`${evidence}/cargar-examen-list.html`, listHtml);
await page.screenshot({ path: `${evidence}/cargar-examen-list.png` });
if (!listHtml.includes(examName) || !listHtml.includes(tema)) {
  throw new Error("examenes list missing exam");
}

await page.getByRole("link", { name: examName }).click();
await page.waitForURL(/\/examenes\/[0-9a-f-]+$/i);
await page.getByRole("heading", { name: "Editar examen" }).waitFor();
const detailHtml = await page.content();
writeFileSync(`${evidence}/cargar-examen-detail.html`, detailHtml);
if (
  (await page.getByLabel("Nombre del examen").inputValue()) !== examName ||
  (await page.getByLabel("Objetivo personal").inputValue()) !== objective
) {
  throw new Error("detail did not load stored name/objective");
}

await page.getByLabel("Objetivo personal").fill(editedObjective);
await page.getByRole("button", { name: "Guardar examen" }).click();
await page.waitForURL(/\/examenes\/[0-9a-f-]+$/i);
await page.reload({ waitUntil: "networkidle" });
if ((await page.getByLabel("Objetivo personal").inputValue()) !== editedObjective) {
  throw new Error("edited objective did not persist");
}

await page.goto(`${baseUrl}/materias/${materiaId}/examen`, {
  waitUntil: "networkidle",
});
await page.getByRole("heading", { name: "Crear examen objetivo" }).waitFor();
const recreateHtml = await page.content();
writeFileSync(`${evidence}/cargar-examen-recreate.html`, recreateHtml);
if ((await page.getByLabel("Nombre del examen").inputValue()).trim() !== "") {
  throw new Error("re-opening /examen must be a blank create form");
}
if (recreateHtml.includes("Cargando")) {
  throw new Error("re-open create form flashed Cargando");
}

await page.getByLabel("Nombre del examen").fill(examName);
await page.getByLabel("Fecha del examen").fill(date);
await page.getByRole("button", { name: "Guardar examen" }).click();
await page.getByRole("alert").waitFor();
const dup = await page.getByRole("alert").innerText();
if (!dup.includes("Ya existe")) {
  throw new Error(`expected duplicate alert, got: ${dup}`);
}
if (!page.url().includes("/examen")) {
  throw new Error("duplicate submit must stay on create form");
}

const pdfPath = `${evidence}/tiny-69b.pdf`;
writeFileSync(pdfPath, Buffer.alloc(69, 0x20));

await page.goto(`${baseUrl}/materias/${materiaId}/cargar`, {
  waitUntil: "networkidle",
});
await page.getByRole("heading", { name: "Seleccionar archivos" }).waitFor();
const cargarHtml = await page.content();
assertNo(cargarHtml, /Paso 1 de 5/i, "fake upload wizard");
await page.getByLabel("Explorar archivos").setInputFiles(pdfPath);
await page.getByText("69 B").waitFor();
const selectedHtml = await page.content();
writeFileSync(`${evidence}/cargar-examen-upload.html`, selectedHtml);
if (selectedHtml.includes("0 KB")) {
  throw new Error("tiny PDF shown as 0 KB");
}
await page.getByRole("button", { name: "Guardar archivos" }).click();
await page.waitForURL(/\/apuntes$/, { timeout: 20000 });
await page.reload({ waitUntil: "networkidle" });
const apuntesHtml = await page.content();
writeFileSync(`${evidence}/cargar-examen-apuntes.html`, apuntesHtml);
await page.screenshot({ path: `${evidence}/cargar-examen-apuntes.png` });
if (!apuntesHtml.includes("tiny-69b.pdf") || !apuntesHtml.includes("69 B")) {
  throw new Error("apuntes missing tiny PDF name or honest size");
}
if (apuntesHtml.includes("0 KB")) {
  throw new Error("apuntes listed tiny PDF as 0 KB");
}

await page.goto(`${baseUrl}/materias/${materiaId}/examenes`, {
  waitUntil: "networkidle",
});
await page.getByRole("link", { name: examName }).click();
await page.getByRole("button", { name: "Eliminar examen" }).click();
await page.getByRole("button", { name: "Confirmar eliminar examen" }).click();
await page.waitForURL(/\/examenes$/, { timeout: 20000 });
await page.reload({ waitUntil: "networkidle" });
const emptyList = await page.content();
writeFileSync(`${evidence}/cargar-examen-deleted.html`, emptyList);
if (emptyList.includes(examName)) {
  throw new Error("exam still listed after delete");
}
if (!emptyList.includes("Todavía no cargaste un examen")) {
  throw new Error("empty examenes copy missing after delete");
}

await context.close();
console.log("drive-cargar-examen ok");
