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

const materiaName = "Mecánica del continuo";
const fileName = "cauchy-stress.txt";
const token = "ARQUIMES-TENSOR-CAUCHY";
const fileBody = `El tensor de Cauchy-Stress (σ) describe las fuerzas internas por unidad de área en un continuo. En equilibrio, div σ + ρb = 0. Token: ${token}.`;
const question = "¿Qué describe el tensor de Cauchy-Stress?";

const filePath = `${evidence}/${fileName}`;
writeFileSync(filePath, fileBody);

function chat(page) {
  return page.getByRole("complementary", { name: "Chat de estudio" });
}

async function sendChat(page, text) {
  const rail = chat(page);
  const before = await rail.locator('[data-chat-role="assistant"]').count();
  await rail.getByLabel("Escribí un mensaje").fill(text);
  await rail.getByRole("button", { name: "Enviar mensaje" }).click();
  await page.waitForFunction(
    (n) => document.querySelectorAll('[data-chat-role="assistant"]').length > n,
    before,
    { timeout: 20000 }
  );
}

function lastAssistantText(html) {
  const matches = [
    ...html.matchAll(
      /data-chat-role="assistant"[^>]*>([\s\S]*?)<\/p>/g
    ),
  ];
  if (matches.length === 0) return "";
  return matches[matches.length - 1][1]
    .replace(/<[^>]+>/g, " ")
    .replace(/&laquo;|&raquo;|&quot;|&#39;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
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
const materiaUrl = page.url();
const materiaId = materiaUrl.split("/materias/")[1].split("/")[0];

await chat(page).waitFor();
await sendChat(page, question);
await page.waitForTimeout(400);

const emptyHtml = await page.content();
writeFileSync(`${evidence}/chat-empty.html`, emptyHtml);
await page.screenshot({ path: `${evidence}/chat-empty.png` });

const emptyReply = lastAssistantText(emptyHtml);
if (!emptyReply) {
  throw new Error("empty chat: no assistant reply");
}
if (
  !/apuntes|archivos de examen|material/i.test(emptyReply) ||
  !/no voy a inventar|no puedo|todavía no hay/i.test(emptyReply)
) {
  throw new Error(`empty chat: expected honest empty, got: ${emptyReply}`);
}
if (/\b78\s*%|sí, estás preparado|estás muy preparado/i.test(emptyReply)) {
  throw new Error(`empty chat claimed readiness: ${emptyReply}`);
}
if (/cómo puedo ayudarte|soy un asistente|generic chatbot/i.test(emptyReply)) {
  throw new Error(`empty chat used generic voice: ${emptyReply}`);
}
if (emptyReply.includes(token) || emptyHtml.includes(fileName)) {
  throw new Error("empty chat leaked file content before upload");
}

await page.goto(`${baseUrl}/materias/${materiaId}/cargar`, {
  waitUntil: "networkidle",
});
await page.getByRole("heading", { name: "Seleccionar archivos" }).waitFor();
await page.getByLabel("Explorar archivos").setInputFiles(filePath);
await page.getByRole("button", { name: "Guardar archivos" }).click();
await page.waitForURL(/\/apuntes$/, { timeout: 20000 });
await page.reload({ waitUntil: "networkidle" });
const apuntesHtml = await page.content();
writeFileSync(`${evidence}/chat-apuntes.html`, apuntesHtml);
if (!apuntesHtml.includes(fileName)) {
  throw new Error("apuntes missing uploaded study file");
}

await page.goto(`${baseUrl}/materias/${materiaId}`, {
  waitUntil: "networkidle",
});
await chat(page).waitFor();
await sendChat(page, question);
await page.waitForTimeout(400);

const groundedHtml = await page.content();
writeFileSync(`${evidence}/chat-grounded.html`, groundedHtml);
await page.screenshot({ path: `${evidence}/chat-grounded.png` });

const groundedReply = lastAssistantText(groundedHtml);
if (!groundedReply.includes(token)) {
  throw new Error(`grounded chat missing file token: ${groundedReply}`);
}
if (!groundedHtml.includes(fileName)) {
  throw new Error("grounded chat did not cite the uploaded filename");
}
assertNo(groundedReply, /estás muy preparado|78%/, "fake prepared score");

await page.reload({ waitUntil: "networkidle" });
const persistHtml = await page.content();
writeFileSync(`${evidence}/chat-persist.html`, persistHtml);
await page.screenshot({ path: `${evidence}/chat-persist.png` });

if (!persistHtml.includes(question) || !persistHtml.includes(token)) {
  throw new Error("chat thread did not persist after reload");
}
if (!persistHtml.includes(fileName)) {
  throw new Error("persisted thread lost the file citation");
}

await context.close();
console.log("drive-chat-estudio ok");
