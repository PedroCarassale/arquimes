import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:43167";
const outDir = path.resolve("artifacts/ui-polish");

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();

await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });

await page.getByLabel("Email").fill("correo-invalido");
await page.getByLabel("Contraseña").fill("123");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForTimeout(200);

const invalidMessage = await page
  .locator(".t-input-wrap.is-error .t-error-msg")
  .first()
  .innerText();

await page.screenshot({
  path: path.join(outDir, "auth-invalid-es.png"),
  fullPage: true,
});

const cursorData = await page.evaluate(() => {
  const submit = Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Entrar")
  );
  const google = Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Google")
  );
  let googleEnabledCursor = "missing";
  if (google) {
    const previousDisabled = google.hasAttribute("disabled");
    google.removeAttribute("disabled");
    googleEnabledCursor = window.getComputedStyle(google).cursor;
    if (previousDisabled) {
      google.setAttribute("disabled", "");
    }
  }
  return {
    entrar: submit ? window.getComputedStyle(submit).cursor : "missing",
    google: google ? window.getComputedStyle(google).cursor : "missing",
    googleWhenEnabled: googleEnabledCursor,
  };
});

await page.evaluate((data) => {
  const panel = document.createElement("div");
  panel.setAttribute("id", "cursor-proof");
  panel.style.position = "fixed";
  panel.style.right = "16px";
  panel.style.bottom = "16px";
  panel.style.zIndex = "9999";
  panel.style.padding = "10px 12px";
  panel.style.background = "rgba(10, 10, 10, 0.92)";
  panel.style.border = "1px solid rgba(243, 164, 75, 0.6)";
  panel.style.color = "#f5f5f4";
  panel.style.fontFamily = "monospace";
  panel.style.fontSize = "12px";
  panel.textContent = `cursor Entrar=${data.entrar} | Google=${data.google} | Google(enabled)=${data.googleWhenEnabled}`;
  document.body.appendChild(panel);
}, cursorData);

await page.screenshot({
  path: path.join(outDir, "auth-pointer-buttons.png"),
  fullPage: true,
});

await fs.writeFile(
  path.join(outDir, "auth-cursor-check.json"),
  JSON.stringify(
    {
      baseUrl,
      invalidMessage,
      ...cursorData,
      screenshots: ["auth-invalid-es.png", "auth-pointer-buttons.png"],
    },
    null,
    2
  )
);

await browser.close();
console.log("auth ui polish evidence captured in", outDir);
