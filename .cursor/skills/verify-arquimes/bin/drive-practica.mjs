#!/usr/bin/env node
import { chromium } from "playwright";
import { randomBytes } from "node:crypto";
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
  console.error("missing --base-url --user-data-dir --evidence");
  process.exit(1);
}

if (baseUrl.includes("vercel.app")) {
  console.error("refuse production");
  process.exit(1);
}

mkdirSync(evidence, { recursive: true });

const suffix = randomBytes(3).toString("hex");
const materiaName = `Mecánica de fluidos ${suffix}`;
const note = `Parcial 1 ${suffix}`;
const tema = "Ecuación de Bernoulli";
const pdfName = `parcial-fluidos-${suffix}.pdf`;
const pdfPath = `${evidence}/${pdfName}`;
const answer =
  "Relaciona presión, velocidad y altura en un fluido incompresible.";

writeFileSync(pdfPath, Buffer.alloc(69, 0x20));

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
const materiaId = materiaUrl.split("/materias/")[1].split("/")[0];

await page.getByRole("link", { name: "Práctica", exact: true }).click();
await page.waitForURL(/\/practica$/);
await page.getByRole("heading", { name: "Práctica" }).waitFor();
const emptyHtml = await page.content();
writeFileSync(`${evidence}/practica-empty.html`, emptyHtml);
await page.screenshot({ path: `${evidence}/practica-empty.png` });
if (!emptyHtml.includes("No hay temas ni archivos para practicar")) {
  throw new Error("empty práctica copy missing");
}
if (emptyHtml.includes("cursor-not-allowed") && emptyHtml.includes(">Práctica<")) {
  const practicaTab = page.getByRole("link", { name: "Práctica", exact: true });
  if ((await practicaTab.count()) === 0) {
    throw new Error("Práctica tab is still inert");
  }
}
assertNo(emptyHtml, /Paso 1 de/i, "practice wizard");

await page.getByRole("link", { name: "Resumen", exact: true }).click();
await page.waitForURL(new RegExp(`/materias/${materiaId}$`));
await page.getByRole("link", { name: /Cargar examen/ }).click();
await page.waitForURL(/\/examen$/);
await page.getByRole("heading", { name: "Cargar examen" }).waitFor();

const formHtml = await page.content();
assertNo(formHtml, /Paso 1 de 3/i, "fake exam wizard");
assertNo(formHtml, /Crear examen objetivo/, "old exam wizard heading");
assertNo(formHtml, /Fecha del examen/, "fecha blocker");

await page.getByLabel("Archivo del examen").setInputFiles(pdfPath);
await page.getByText("69 B").waitFor();
await page.getByLabel("De qué trata").fill(note);
await page.getByRole("button", { name: "Guardar examen" }).click();
await page.waitForURL(/\/examenes$/, { timeout: 20000 });

await page.getByRole("link", { name: note }).click();
await page.waitForURL(/\/examenes\/[0-9a-f-]+$/i);
await page.getByRole("heading", { name: note }).waitFor();

await page.getByLabel("Agregar otro tema").fill(tema);
await page.getByRole("button", { name: "Agregar tema" }).click();
await page.getByText(tema, { exact: true }).waitFor({ timeout: 20000 });

await page.getByRole("link", { name: "Resumen", exact: true }).click();
await page.waitForURL(new RegExp(`/materias/${materiaId}$`));
await page.reload({ waitUntil: "networkidle" });

const beforeHtml = await page.content();
writeFileSync(`${evidence}/practica-resumen-before.html`, beforeHtml);
await page.screenshot({ path: `${evidence}/practica-resumen-before.png` });
if (!beforeHtml.includes(tema) || !beforeHtml.includes("No estudiado")) {
  throw new Error("resumen missing tema at no estudiado before practice");
}
if (!beforeHtml.includes("0%") && !beforeHtml.includes("sin práctica")) {
  throw new Error("expected 0% / sin práctica before answering");
}
if (beforeHtml.includes("Estudiado") && !beforeHtml.includes("No estudiado")) {
  throw new Error("mastery already estudiado before practice");
}

await page.getByRole("link", { name: "Práctica", exact: true }).click();
await page.waitForURL(/\/practica$/);
await page.getByRole("heading", { name: "Práctica" }).waitFor();
const itemHtml = await page.content();
writeFileSync(`${evidence}/practica-item.html`, itemHtml);
await page.screenshot({ path: `${evidence}/practica-item.png` });
if (!itemHtml.includes(tema)) {
  throw new Error("practice item missing tema name");
}
assertNo(itemHtml, /Paso 1 de/i, "practice wizard");

await page.getByLabel("Tu respuesta").fill(answer);
await page.getByRole("button", { name: "Así lo explicaría" }).click();
await page.getByText("Práctica guardada").waitFor({ timeout: 20000 });
const savedHtml = await page.content();
writeFileSync(`${evidence}/practica-saved.html`, savedHtml);
await page.screenshot({ path: `${evidence}/practica-saved.png` });
if (!savedHtml.includes("Estudiado")) {
  throw new Error("saved practice did not show Estudiado");
}

await page.getByRole("link", { name: /Ver preparación en Resumen/ }).click();
await page.waitForURL(new RegExp(`/materias/${materiaId}$`));
await page.reload({ waitUntil: "networkidle" });
const afterHtml = await page.content();
writeFileSync(`${evidence}/practica-resumen-after.html`, afterHtml);
await page.screenshot({ path: `${evidence}/practica-resumen-after.png` });

if (!afterHtml.includes(tema)) {
  throw new Error("resumen missing tema after practice");
}
if (!afterHtml.includes("Estudiado")) {
  throw new Error("resumen tema did not become Estudiado after refresh");
}
const percentText = await page
  .locator(".text-3xl.font-serif")
  .filter({ hasText: "%" })
  .first()
  .innerText();
const percent = Number.parseInt(percentText, 10);
if (!Number.isFinite(percent) || percent <= 0) {
  throw new Error(`preparado did not increase, got ${percentText}`);
}

await context.close();
console.log("drive-practica ok:", materiaName, tema, percentText);
