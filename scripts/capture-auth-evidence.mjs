import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:43167";
const outDir = path.resolve("artifacts/auth-evidence");

const timestamp = Date.now();
const userA = {
  name: "Usuario A",
  email: `usuario-a-${timestamp}@example.com`,
  password: "ClaveSegura123!",
};
const userB = {
  name: "Usuario B",
  email: `usuario-b-${timestamp}@example.com`,
  password: "ClaveSegura123!",
};
const materiaName = `Materia Aislada ${timestamp}`;

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1360, height: 900 },
});
const page = await context.newPage();

async function register(user) {
  await page.goto(`${baseUrl}/register`, { waitUntil: "networkidle" });
  await page.getByLabel("Nombre").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL(`${baseUrl}/`, { timeout: 15000 });
  await page.getByRole("heading", { name: "Tus materias" }).waitFor();
}

await page.goto(`${baseUrl}/register`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outDir, "01-register-screen.png"), fullPage: true });

await register(userA);

await page.goto(`${baseUrl}/materias/nueva`, { waitUntil: "networkidle" });
await page.getByLabel("Nombre de la materia").fill(materiaName);
await page.getByRole("button", { name: "Crear materia" }).click();
await page.waitForURL(/\/materias\/[^/]+\/inicio$/, { timeout: 15000 });
const materiaMatch = page.url().match(/\/materias\/([^/]+)\/inicio$/);
if (!materiaMatch) {
  throw new Error("No pude capturar el id de la materia de A.");
}
const materiaAId = materiaMatch[1];

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.getByText(materiaName).waitFor({ timeout: 15000 });
await page.screenshot({ path: path.join(outDir, "02-user-a-home-with-materia.png"), fullPage: true });

await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find((node) =>
    node.textContent?.includes("Cerrar sesión")
  );
  button?.click();
});
try {
  await page.waitForURL(`${baseUrl}/login`, { timeout: 10000 });
} catch {
  await context.clearCookies();
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
}
await page.screenshot({ path: path.join(outDir, "03-login-screen.png"), fullPage: true });

await register(userB);
await page.getByRole("heading", { name: "Tus materias" }).waitFor();
const hasMateriaFromA = await page.getByText(materiaName).count();
if (hasMateriaFromA !== 0) {
  throw new Error("Fuga detectada: usuario B ve materia de A.");
}
await page.screenshot({ path: path.join(outDir, "04-user-b-home-empty.png"), fullPage: true });

await page.goto(`${baseUrl}/materias/${materiaAId}`, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(outDir, "05-user-b-cannot-open-a-materia.png"), fullPage: true });

await fs.writeFile(
  path.join(outDir, "run-summary.json"),
  JSON.stringify(
    {
      baseUrl,
      userA: { email: userA.email, materiaName, materiaId: materiaAId },
      userB: { email: userB.email },
      screenshots: [
        "01-register-screen.png",
        "02-user-a-home-with-materia.png",
        "03-login-screen.png",
        "04-user-b-home-empty.png",
        "05-user-b-cannot-open-a-materia.png",
      ],
    },
    null,
    2
  )
);

await browser.close();
console.log("auth evidence captured in", outDir);
