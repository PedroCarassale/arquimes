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
  const schemaName =
    body?.response_format?.json_schema?.name ||
    body?.response_format?.json_schema?.schema?.title;

  if (schemaName === "arquimedes_plan_preparacion_v1") {
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const userText = String(messages.at(-1)?.content || "");
    const plan = buildPreparationPlan(userText);

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        id: "chatcmpl-arquimes-preparacion-local",
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify(plan),
            },
          },
        ],
      })
    );
    return;
  }

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
    "\\Delta",
    "\\frac",
    "sin envolverlo en JSON",
    "ARQUIMES_CITATIONS",
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
    "El índice completo del material muestra esta ruta:",
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
    "Más adelante, el error relativo usa la fracción \\(\\epsilon=\\frac{\\Delta(a)}{|\\alpha|}\\).",
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
            content: `${answer}\n\n<!-- ARQUIMES_CITATIONS: ${JSON.stringify([
              sourceName,
            ])} -->`,
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

function buildPreparationPlan(userText) {
  const fecha = userText.match(/Fecha del parcial:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
  const rawTemas = userText.match(/Temas a evaluar:\s*(.+)/)?.[1] || "";
  const temas = rawTemas
    .split("|")
    .map((tema) => tema.trim())
    .filter(Boolean)
    .slice(0, 6);

  const examDate = fecha || nextDate(14);
  const dias = Math.max(3, diffInDays(examDate));
  const diasPlan = Math.min(8, dias);
  const semanas = Math.max(1, Math.min(4, Math.ceil(dias / 7)));

  return {
    resumen: {
      objetivo: "Consolidar teoría y práctica para llegar al parcial con seguridad.",
      diasHastaParcial: dias,
      minutosPorDia: dias < 10 ? 100 : 80,
    },
    semanas: Array.from({ length: semanas }, (_, index) => ({
      semana: index + 1,
      foco: `Semana ${index + 1}: consolidar ${temas[index % Math.max(temas.length, 1)] || "temas base"}`,
      temas: temas.length ? temas.slice(0, Math.min(temas.length, 4)) : ["Repaso general"],
      meta: "Cerrar conceptos clave con ejercicios y autoexplicación breve.",
    })),
    agendaDiaria: Array.from({ length: diasPlan }, (_, index) => {
      const fechaDia = addDays(examDate, -(diasPlan - index));
      const tema = temas[index % Math.max(temas.length, 1)] || "Repaso general";
      return {
        dia: index + 1,
        fecha: fechaDia,
        foco: `Profundizar ${tema}`,
        tareas: [
          `Leer y resumir ${tema} en una hoja.`,
          `Resolver 3 ejercicios cortos de ${tema}.`,
          "Explicar en voz alta el tema sin apuntes.",
        ],
        checkpoint: `Poder explicar ${tema} con un ejemplo propio.`,
      };
    }),
    hitos: [
      {
        titulo: "Chequeo intermedio",
        fecha: addDays(examDate, -Math.max(2, Math.floor(dias / 2))),
        criterio: "Resolver una mini guía sin mirar apuntes.",
      },
      {
        titulo: "Simulacro final",
        fecha: addDays(examDate, -1),
        criterio: "Hacer un parcial simulado cronometrado y corregir errores.",
      },
    ],
  };
}

function diffInDays(yyyyMmDd) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(`${yyyyMmDd}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function addDays(yyyyMmDd, delta) {
  const date = new Date(`${yyyyMmDd}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

function nextDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
