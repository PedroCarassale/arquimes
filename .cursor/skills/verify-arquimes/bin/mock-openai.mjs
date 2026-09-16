#!/usr/bin/env node
import { createServer } from "node:http";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    port: { type: "string" },
  },
});
const port = Number(values.port);

if (!Number.isInteger(port) || port <= 0) {
  console.error("mock-openai: missing valid --port");
  process.exit(1);
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("ok");
    return;
  }

  if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
    response.writeHead(404);
    response.end();
    return;
  }

  const body = await readJson(request);
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const system = String(messages.find((message) => message?.role === "system")?.content || "");
  const user = String(messages.at(-1)?.content || "");
  const sourceName = system.match(/FUENTE: (teoria-errores-[^\n]+\.pdf)/)?.[1];

  const requiredContext = [
    "ARQUIMES-VALOR-APROXIMADO",
    "ARQUIMES-ERROR-ABSOLUTO",
    "ARQUIMES-ERROR-RELATIVO",
    "ARQUIMES-ERROR-PORCENTUAL",
  ];
  const requiredTutorRules = [
    "armá un mapa honesto",
    "enseñá SOLO el primer bloque",
    "2 o 3 preguntas cortas",
    "compatible con KaTeX",
  ];
  const missing = [
    ...requiredContext.filter((token) => !system.includes(token)),
    ...requiredTutorRules.filter((rule) => !system.includes(rule)),
  ];

  if (
    !sourceName ||
    missing.length > 0 ||
    !/necesito aprender todo el apunte/i.test(user)
  ) {
    console.error(
      JSON.stringify({
        rejected: true,
        sourceName: sourceName || null,
        missing,
        user,
      })
    );
    response.writeHead(422, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        error: {
          message: `El prompt tutor no cumple el contrato local: ${missing.join(", ") || "consulta o fuente"}`,
        },
      })
    );
    return;
  }

  console.log(`accepted tutor request for ${sourceName}`);

  // El retardo hace observable y verificable el estado optimista del messenger.
  await new Promise((resolve) => setTimeout(resolve, 900));

  const answer = [
    "## Mapa del apunte",
    "",
    "Con lo que pude recuperar del material, la ruta es:",
    "",
    "1. Valor exacto y valor aproximado.",
    "2. Error absoluto.",
    "3. Error relativo.",
    "4. Error porcentual.",
    "",
    "Vamos a abrir **solo el primer bloque** y después chequeamos si quedó firme.",
    "",
    "## Bloque 1 · Exacto vs. aproximado",
    "",
    "El apunte distingue el valor exacto \\(\\alpha\\) del valor aproximado \\(a\\). La aproximación aparece cuando medimos, redondeamos o truncamos un cálculo.",
    "",
    "La diferencia se cuantifica con el error absoluto:",
    "",
    "$$",
    "\\Delta(a)=|\\alpha-a|",
    "$$",
    "",
    "### Ejemplo",
    "",
    "Si \\(\\alpha=10\\) y usamos \\(a=9{,}8\\), entonces:",
    "",
    "$$",
    "\\Delta(a)=|10-9{,}8|=0{,}2",
    "$$",
    "",
    "> **Idea clave:** \\(\\alpha\\) es el valor de referencia; \\(a\\) es la aproximación y \\(\\Delta(a)\\) mide cuánto se separan.",
    "",
    "### Chequeo rápido",
    "",
    "1. ¿Cuál símbolo representa el valor exacto y cuál la aproximación?",
    "2. Si \\(\\alpha=5\\) y \\(a=4{,}7\\), ¿cuánto vale \\(\\Delta(a)\\)?",
    "3. ¿Por qué el error absoluto nunca puede ser negativo?",
  ].join("\n");

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      id: "chatcmpl-arquimes-local",
      choices: [
        {
          message: {
            role: "assistant",
            content: JSON.stringify({
              answer,
              citations: [sourceName],
            }),
          },
        },
      ],
    })
  );
});

server.listen(port, "127.0.0.1", () => {
  console.log(`mock-openai listening on http://127.0.0.1:${port}`);
});

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("request too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}
