import type { EvaluacionKind, ExamType } from "./types";

export const HORA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const EVALUACION_ERRORES = {
  nombre: "Poné un nombre.",
  hora: "La hora tiene que ser HH:MM.",
  fecha: "La fecha tiene que ser AAAA-MM-DD.",
} as const;

export type ParsedEvaluacionInput = {
  kind?: EvaluacionKind;
  name?: string;
  type?: ExamType;
  date?: string;
  hora?: string;
  description?: string;
  temas: string[];
  error?: string;
};

const kinds: readonly EvaluacionKind[] = ["examen", "entrega", "evento"];
const types: readonly ExamType[] = ["parcial", "recuperatorio", "final"];

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const MAX_RANGO_EVENTOS_DIAS = 400;

export function parseRangoEventos(
  params: URLSearchParams
): { desde: string; hasta: string } | { error: string } {
  const desde = params.get("desde")?.trim() ?? "";
  const hasta = params.get("hasta")?.trim() ?? "";
  if (!isValidDate(desde) || !isValidDate(hasta)) {
    return { error: "Pasá desde y hasta como AAAA-MM-DD." };
  }
  const dias = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000;
  if (dias < 0) return { error: "La fecha hasta tiene que ser posterior a desde." };
  if (dias > MAX_RANGO_EVENTOS_DIAS) {
    return { error: `El rango no puede superar ${MAX_RANGO_EVENTOS_DIAS} días.` };
  }
  return { desde, hasta };
}

export function parseEvaluacionInput(raw: unknown): ParsedEvaluacionInput {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : undefined);
  const kind = kinds.find((k) => k === body.kind);
  const type = types.find((t) => t === body.type);
  const date = text(body.date);
  const hora = text(body.hora);
  const temas = Array.isArray(body.temas)
    ? [...new Set(body.temas.map(text).filter((t): t is string => Boolean(t)))]
    : [];
  const error =
    hora && !HORA_PATTERN.test(hora)
      ? EVALUACION_ERRORES.hora
      : date && !isValidDate(date)
        ? EVALUACION_ERRORES.fecha
        : undefined;
  return {
    kind,
    name: text(body.name),
    type,
    date,
    hora,
    description: text(body.description),
    temas,
    ...(error ? { error } : {}),
  };
}
