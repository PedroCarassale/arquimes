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
  console.error("missing args");
  process.exit(1);
}
if (baseUrl.includes("vercel.app")) {
  console.error("refuse production");
  process.exit(1);
}

mkdirSync(evidence, { recursive: true });

const suffix = randomBytes(3).toString("hex");
const materiaName = `Mecánica del continuo ${suffix}`;
const apunteFileName = `apunte-cauchy-${suffix}.pdf`;
const examFileName = `parcial-fluidos-${suffix}.txt`;
const token = "ARQUIMES-TENSOR-CAUCHY";
const fileBody = Array.from({ length: 220 })
  .map(
    (_, i) =>
      `Página de apuntes ${i + 1}. El tensor de Cauchy-Stress (σ) describe fuerzas internas por unidad de área. En equilibrio, div σ + ρb = 0. Token: ${token}.`
  )
  .join("\n");
const examBody = `Parcial integrador de mecánica de fluidos. Se evalúa Cauchy-Stress, conservación de masa y energía.`;
const examNote = "Parcial 2023 de fluidos continuos";
const tema = "Conservación de masa";
const question = "¿Qué describe el tensor de Cauchy-Stress?";
const shortcutPrompt = "Haceme un resumen completo de lo que entra.";

const apunteFilePath = `${evidence}/${apunteFileName}`;
const examFilePath = `${evidence}/${examFileName}`;
writeFileSync(examFilePath, examBody);

async function writePdfWithText(path, text) {
  const lines = text.split("\n").slice(0, 360);
  const textOps = [
    "BT",
    "/F1 10 Tf",
    "44 800 Td",
    "13 TL",
    ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
    "ET",
    "",
  ].join("\n");
  const stream = Buffer.from(textOps, "latin1");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream.toString("latin1")}endstream`,
  ];

  let body = "";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(body.length + "%PDF-1.4\n".length);
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = "%PDF-1.4\n".length + body.length;
  const xrefEntries = offsets
    .map((offset, index) => {
      if (index === 0) return "0000000000 65535 f ";
      return `${String(offset).padStart(10, "0")} 00000 n `;
    })
    .join("\n");
  const trailer = `xref\n0 ${objects.length + 1}\n${xrefEntries}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  const pdf = `%PDF-1.4\n${body}${trailer}`;
  writeFileSync(path, pdf, "latin1");
}

function escapePdfText(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ");
}

async function sendChat(page, text) {
  const waitPost = page.waitForResponse(
    (res) =>
      res.url().includes("/api/chat") &&
      res.request().method() === "POST" &&
      res.status() < 500,
    { timeout: 45000 }
  );
  await page.getByLabel("Escribí un mensaje").fill(text);
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await waitPost;
  await page.waitForFunction(
    (message) => {
      const body = document.body.textContent || "";
      return (
        body.includes(message) ||
        /No hay proveedor de IA configurado|falta OPENAI_API_KEY|falta ANTHROPIC_API_KEY/i.test(
          body
        )
      );
    },
    text,
    { timeout: 45000 }
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
await writePdfWithText(apunteFilePath, fileBody);

await page.goto(baseUrl + "/materias/nueva", { waitUntil: "networkidle" });
await page.getByLabel("Nombre de la materia").fill(materiaName);
await page.getByRole("button", { name: "Crear materia" }).click();
await page.waitForURL(/\/materias\/[0-9a-f-]+$/i, { timeout: 20000 });
await page.getByRole("heading", { name: materiaName, exact: true }).waitFor();
const materiaUrl = page.url();
const materiaId = materiaUrl.split("/materias/")[1].split("/")[0];

await page.getByRole("link", { name: "Chat", exact: true }).click();
await page.waitForURL(new RegExp(`/materias/${materiaId}/chat$`), {
  timeout: 20000,
});
await page.getByRole("heading", { name: "Compañero de preparación" }).waitFor();
await page.getByRole("button", { name: shortcutPrompt }).click();
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
if (emptyReply.includes(token) || emptyHtml.includes(apunteFileName)) {
  throw new Error("empty chat leaked file content before upload");
}
if (!emptyHtml.includes(shortcutPrompt)) {
  throw new Error("missing shortcut chip in chat UI");
}

await page.goto(`${baseUrl}/materias/${materiaId}/cargar`, {
  waitUntil: "networkidle",
});
await page.getByRole("heading", { name: "Seleccionar archivos" }).waitFor();
await page.getByLabel("Explorar archivos").setInputFiles(apunteFilePath);
await page.getByText(apunteFileName, { exact: true }).waitFor();
await page.getByRole("button", { name: "Guardar archivos" }).click();
await page.waitForURL(
  new RegExp(`/materias/${materiaId}/apuntes$`),
  { timeout: 20000 }
);
await page.reload({ waitUntil: "networkidle" });
const apuntesHtml = await page.content();
writeFileSync(`${evidence}/chat-apuntes.html`, apuntesHtml);
if (!apuntesHtml.includes(apunteFileName)) {
  throw new Error("apuntes missing uploaded study file");
}
const apunteStats = page.locator(`text=${apunteFileName}`);
await apunteStats.first().waitFor();

const groundingRes = await page.request.get(
  `${baseUrl}/api/chat?materiaId=${materiaId}`
);
if (!groundingRes.ok()) {
  throw new Error(`grounding fetch failed: ${groundingRes.status()}`);
}
const groundingJson = await groundingRes.json();
writeFileSync(
  `${evidence}/chat-grounding.json`,
  JSON.stringify(groundingJson, null, 2)
);
const readableCount = groundingJson?.grounding?.readableCount ?? 0;
if (readableCount < 1) {
  throw new Error(
    `expected grounding.readableCount > 0 after PDF upload, got ${readableCount}`
  );
}

await page.goto(`${baseUrl}/materias/${materiaId}/examen`, {
  waitUntil: "networkidle",
});
await page.getByRole("heading", { name: "Cargar examen" }).waitFor();
await page.getByLabel("Archivo del examen").setInputFiles(examFilePath);
await page.getByLabel("De qué trata").fill(examNote);
await page.getByRole("button", { name: "Guardar examen" }).click();
await page.waitForURL(new RegExp(`/materias/${materiaId}/examenes$`), {
  timeout: 20000,
});
await page.locator(`a:has-text("${examFileName}")`).first().click();
await page.waitForURL(new RegExp(`/materias/${materiaId}/examenes/`), {
  timeout: 20000,
});
await page.getByLabel("Agregar otro tema").fill(tema);
await page.getByRole("button", { name: "Agregar tema" }).click();
await page.getByText(tema, { exact: true }).waitFor();

await page.getByRole("link", { name: "Chat", exact: true }).click();
await page.waitForURL(new RegExp(`/materias/${materiaId}/chat$`), {
  timeout: 20000,
});
await page.getByRole("button", { name: "Nuevo chat" }).click();
await sendChat(page, question);
await page.waitForTimeout(400);

const groundedHtml = await page.content();
writeFileSync(`${evidence}/chat-grounded.html`, groundedHtml);
await page.screenshot({ path: `${evidence}/chat-grounded.png` });

const groundedReply = lastAssistantText(groundedHtml);
const providerMissing =
  /No hay proveedor de IA configurado|falta OPENAI_API_KEY|falta ANTHROPIC_API_KEY/i.test(
    groundedReply
  );
if (providerMissing) {
  // Camino válido sin keys en entorno local/verificación.
} else if (!groundedReply.includes(token)) {
  throw new Error(`grounded chat missing file token: ${groundedReply}`);
}
if (!groundedHtml.includes("Nuevo chat")) {
  throw new Error("new session did not appear in list");
}
if (
  !providerMissing &&
  !groundedHtml.includes(examNote) &&
  !groundedHtml.includes(apunteFileName)
) {
  throw new Error("grounding did not reference exam/apunte context");
}
assertNo(groundedReply, /estás muy preparado|78%/, "fake prepared score");

await page.reload({ waitUntil: "networkidle" });
const persistHtml = await page.content();
writeFileSync(`${evidence}/chat-persist.html`, persistHtml);
await page.screenshot({ path: `${evidence}/chat-persist.png` });

if (!persistHtml.includes(question)) {
  throw new Error("chat thread did not persist after reload");
}
if (!persistHtml.includes("Nuevo chat")) {
  throw new Error("session list lost new chat after reload");
}

await context.close();
console.log(`drive-chat-estudio ok ${materiaName} ${apunteFileName}`);
