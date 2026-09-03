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
const materiaName = "Verify Física";
const examName = "Parcial Verify";
const tema = "Cinemática";
const date = "2026-10-15";

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  viewport: { width: 1280, height: 800 },
});
const page = context.pages()[0] || (await context.newPage());

await page.goto(baseUrl + "/materias/nueva", { waitUntil: "networkidle" });
await page.getByLabel("Nombre de la materia").fill(materiaName);
await page.getByRole("button", { name: "Crear materia" }).click();
await page.waitForURL(/\/materias\/[0-9a-f-]+/i, { timeout: 20000 });
await page.getByRole("heading", { name: materiaName }).waitFor();

await page.getByRole("link", { name: /Cargar examen/ }).click();
await page.waitForURL(/\/examen/);
await page.getByRole("heading", { name: "Crear examen objetivo" }).waitFor();
await page.getByLabel("Nombre del examen").fill(examName);
await page.getByLabel("Fecha del examen").fill(date);
await page.getByLabel("Objetivo personal").fill("Resolver sin ayuda");
await page.getByLabel("Agregar otro tema").fill(tema);
await page.getByRole("button", { name: "Agregar tema" }).click();
await page.getByRole("button", { name: "Continuar" }).click();
await page.waitForURL(/\/materias\/[0-9a-f-]+$/);
await page.reload({ waitUntil: "networkidle" });
const html = await page.content();
writeFileSync(`${evidence}/cargar-examen-resumen.html`, html);
await page.screenshot({ path: `${evidence}/cargar-examen-resumen.png` });

if (!html.includes(examName) || !html.includes(tema)) {
  throw new Error("resumen missing exam name or tema after reload");
}

await context.close();
console.log("drive-cargar-examen ok");
