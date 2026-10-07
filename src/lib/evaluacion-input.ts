import type { EvaluacionKind, ExamType } from "./types";

export type ParsedEvaluacionInput = {
  kind?: EvaluacionKind;
  name?: string;
  type?: ExamType;
  date?: string;
  description?: string;
  temas: string[];
};

export function parseEvaluacionInput(raw: unknown): ParsedEvaluacionInput {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : undefined);
  const kind = body.kind === "entrega" ? "entrega" : body.kind === "examen" ? "examen" : undefined;
  const type = body.type === "final" ? "final" : body.type === "parcial" ? "parcial" : undefined;
  const date = text(body.date);
  const temas = Array.isArray(body.temas)
    ? [...new Set(body.temas.map(text).filter((t): t is string => Boolean(t)))]
    : [];
  return {
    kind,
    name: text(body.name),
    type,
    date: date === undefined ? undefined : /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    description: text(body.description),
    temas,
  };
}
