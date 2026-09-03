#!/usr/bin/env node
/**
 * Drive crear-materia in Chromium against the launched local origin.
 * Invocation: bin/drive-crear-materia (wrapper) or:
 *   node bin/drive-crear-materia.mjs --base-url http://127.0.0.1:PORT \
 *     --user-data-dir /tmp/arquimes-verify-…/profile \
 *     --title "Verify Química" --evidence artifacts/verify-arquimes
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "base-url": { type: "string" },
    "user-data-dir": { type: "string" },
    title: { type: "string" },
    evidence: { type: "string" },
  },
});

const baseUrl = values["base-url"];
const userDataDir = values["user-data-dir"];
const title = values.title;
const evidence = values.evidence;

if (!baseUrl || !userDataDir || !title || !evidence) {
  console.error("missing --base-url --user-data-dir --title --evidence");
  process.exit(1);
}

if (baseUrl.includes("vercel.app")) {
  console.error("refuse production");
  process.exit(1);
}

mkdirSync(evidence, { recursive: true });

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  viewport: { width: 1280, height: 800 },
});
const page = context.pages()[0] || (await context.newPage());

await page.goto(baseUrl + "/", { waitUntil: "networkidle" });
writeFileSync(`${evidence}/crear-materia-home-before.html`, await page.content());
await page.screenshot({ path: `${evidence}/crear-materia-home-before.png` });

if (!(await page.getByRole("heading", { name: "Tus materias" }).count())) {
  throw new Error("expected heading Tus materias");
}

await page.getByRole("link", { name: "Crear materia" }).first().click();
await page.waitForURL(/\/materias\/nueva/);
await page.getByRole("heading", { name: /Empezá tu propio espacio/ }).waitFor();
writeFileSync(`${evidence}/crear-materia-form.html`, await page.content());

await page.getByLabel("Nombre de la materia").fill(title);
await page.getByRole("button", { name: "Crear materia" }).click();
await page.waitForURL(/\/materias\/[0-9a-f-]+/i, { timeout: 20000 });
await page.getByRole("heading", { name: title }).waitFor({ timeout: 20000 });
writeFileSync(`${evidence}/crear-materia-resumen.html`, await page.content());
await page.screenshot({ path: `${evidence}/crear-materia-resumen.png` });

await page.goto(baseUrl + "/", { waitUntil: "networkidle" });
await page.reload({ waitUntil: "networkidle" });
const home = await page.content();
writeFileSync(`${evidence}/crear-materia-home-after.html`, home);
await page.screenshot({ path: `${evidence}/crear-materia-home-after.png` });

if (!home.includes(title)) {
  throw new Error("materia name missing on Tus materias after reload");
}

await context.close();
console.log("drive-crear-materia ok:", title);
