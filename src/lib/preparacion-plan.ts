import { ProviderConfigError } from "./ai-providers";
import type { PlanPreparacion } from "./types";

const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.4";
const OPENAI_BASE_URL =
  process.env.OPENAI_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://api.openai.com/v1";
const OPENAI_PLAN_MAX_TOKENS = 6_000;

const PLAN_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumen", "semanas", "agendaDiaria", "hitos"],
  properties: {
    resumen: {
      type: "object",
      additionalProperties: false,
      required: ["objetivo", "diasHastaParcial", "minutosPorDia"],
      properties: {
        objetivo: { type: "string", maxLength: 220 },
        diasHastaParcial: { type: "integer", minimum: 1, maximum: 365 },
        minutosPorDia: { type: "integer", minimum: 15, maximum: 360 },
      },
    },
    semanas: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["semana", "foco", "temas", "meta"],
        properties: {
          semana: { type: "integer", minimum: 1, maximum: 12 },
          foco: { type: "string", maxLength: 180 },
          temas: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: { type: "string", maxLength: 120 },
          },
          meta: { type: "string", maxLength: 220 },
        },
      },
    },
    agendaDiaria: {
      type: "array",
      minItems: 3,
      maxItems: 21,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dia", "fecha", "foco", "tareas", "checkpoint"],
        properties: {
          dia: { type: "integer", minimum: 1, maximum: 60 },
          fecha: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          foco: { type: "string", maxLength: 180 },
          tareas: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: { type: "string", maxLength: 160 },
          },
          checkpoint: { type: "string", maxLength: 180 },
        },
      },
    },
    hitos: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titulo", "fecha", "criterio"],
        properties: {
          titulo: { type: "string", maxLength: 140 },
          fecha: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          criterio: { type: "string", maxLength: 180 },
        },
      },
    },
  },
} as const;

type PlanRaw = {
  resumen: {
    objetivo: string;
    diasHastaParcial: number;
    minutosPorDia: number;
  };
  semanas: Array<{
    semana: number;
    foco: string;
    temas: string[];
    meta: string;
  }>;
  agendaDiaria: Array<{
    dia: number;
    fecha: string;
    foco: string;
    tareas: string[];
    checkpoint: string;
  }>;
  hitos: Array<{
    titulo: string;
    fecha: string;
    criterio: string;
  }>;
};

export function getPlanPreparacionSchema() {
  return PLAN_RESPONSE_SCHEMA;
}

export async function generatePlanPreparacion(input: {
  materiaName: string;
  fechaParcial: string;
  temas: string[];
}): Promise<PlanPreparacion> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new ProviderConfigError(
      "Falta OPENAI_API_KEY para generar el plan de preparación."
    );
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: OPENAI_PLAN_MAX_TOKENS,
      ...(!OPENAI_MODEL.startsWith("gpt-5") ? { temperature: 0.3 } : {}),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "arquimes_plan_preparacion_v1",
          strict: true,
          schema: PLAN_RESPONSE_SCHEMA,
        },
      },
      messages: buildPlanMessages(input),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI devolvió ${response.status}. ${clip(detail, 260)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string; refusal?: string };
    }>;
  };

  const message = data.choices?.[0]?.message;
  if (message?.refusal?.trim()) {
    throw new Error(`El modelo rechazó generar el plan: ${message.refusal.trim()}`);
  }

  const content = message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI no devolvió contenido para el plan.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("La respuesta del modelo no fue JSON válido.");
  }

  const plan = parsePlanRaw(parsed);
  return {
    version: "1",
    generatedAt: new Date().toISOString(),
    ...plan,
  };
}

function buildPlanMessages(input: {
  materiaName: string;
  fechaParcial: string;
  temas: string[];
}) {
  const system = [
    "Sos un planificador académico de Arquimes.",
    "Tu tarea: devolver solo JSON válido y útil para renderizar un plan realista.",
    "No agregues texto fuera del JSON. No uses markdown. No inventes campos.",
    "Usá español rioplatense claro y accionable.",
    "La agenda diaria debe ir en orden cronológico y cada día debe tener foco distinto o complementario.",
  ].join(" ");

  const user = [
    `Materia: ${input.materiaName}`,
    `Fecha del parcial: ${input.fechaParcial}`,
    `Temas a evaluar: ${input.temas.join(" | ")}`,
    "Armá un plan concreto hasta el parcial con semanas, agenda diaria e hitos medibles.",
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function parsePlanRaw(value: unknown): PlanRaw {
  if (!isObject(value)) throw new Error("El plan generado no tiene formato objeto.");
  const resumen = parseResumen(value.resumen);
  const semanas = parseSemanas(value.semanas);
  const agendaDiaria = parseAgenda(value.agendaDiaria);
  const hitos = parseHitos(value.hitos);
  return { resumen, semanas, agendaDiaria, hitos };
}

function parseResumen(value: unknown): PlanRaw["resumen"] {
  if (!isObject(value)) throw new Error("El resumen del plan es inválido.");
  const objetivo = nonEmptyString(value.objetivo, "objetivo", 220);
  const diasHastaParcial = integerInRange(value.diasHastaParcial, 1, 365, "diasHastaParcial");
  const minutosPorDia = integerInRange(value.minutosPorDia, 15, 360, "minutosPorDia");
  return { objetivo, diasHastaParcial, minutosPorDia };
}

function parseSemanas(value: unknown): PlanRaw["semanas"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("El plan no incluye semanas.");
  }
  return value.map((item, index) => {
    if (!isObject(item)) throw new Error(`Semana ${index + 1} inválida.`);
    return {
      semana: integerInRange(item.semana, 1, 12, `semana[${index}]`),
      foco: nonEmptyString(item.foco, `foco[${index}]`, 180),
      temas: stringList(item.temas, `temas[${index}]`, 1, 8, 120),
      meta: nonEmptyString(item.meta, `meta[${index}]`, 220),
    };
  });
}

function parseAgenda(value: unknown): PlanRaw["agendaDiaria"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("El plan no incluye agenda diaria.");
  }
  return value.map((item, index) => {
    if (!isObject(item)) throw new Error(`Día ${index + 1} inválido.`);
    const fecha = nonEmptyString(item.fecha, `fecha[${index}]`, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new Error(`La fecha del día ${index + 1} debe tener formato YYYY-MM-DD.`);
    }
    return {
      dia: integerInRange(item.dia, 1, 60, `dia[${index}]`),
      fecha,
      foco: nonEmptyString(item.foco, `focoDia[${index}]`, 180),
      tareas: stringList(item.tareas, `tareas[${index}]`, 1, 6, 160),
      checkpoint: nonEmptyString(item.checkpoint, `checkpoint[${index}]`, 180),
    };
  });
}

function parseHitos(value: unknown): PlanRaw["hitos"] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("El plan no incluye hitos.");
  }
  return value.map((item, index) => {
    if (!isObject(item)) throw new Error(`Hito ${index + 1} inválido.`);
    const fecha = nonEmptyString(item.fecha, `hitoFecha[${index}]`, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new Error(`La fecha del hito ${index + 1} debe tener formato YYYY-MM-DD.`);
    }
    return {
      titulo: nonEmptyString(item.titulo, `titulo[${index}]`, 140),
      fecha,
      criterio: nonEmptyString(item.criterio, `criterio[${index}]`, 180),
    };
  });
}

function stringList(
  value: unknown,
  field: string,
  min: number,
  max: number,
  itemMaxLength: number
): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new Error(`El campo ${field} debe tener entre ${min} y ${max} items.`);
  }
  return value.map((item, idx) =>
    nonEmptyString(item, `${field}[${idx}]`, itemMaxLength)
  );
}

function nonEmptyString(value: unknown, field: string, maxLength = 220): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`El campo ${field} debe ser texto no vacío.`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length > maxLength) {
    throw new Error(`El campo ${field} supera el máximo de ${maxLength} caracteres.`);
  }
  return normalized;
}

function integerInRange(
  value: unknown,
  min: number,
  max: number,
  field: string
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`El campo ${field} debe ser entero entre ${min} y ${max}.`);
  }
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clip(text: string, max: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trim()}…`;
}
