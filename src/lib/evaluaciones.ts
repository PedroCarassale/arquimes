import type { ExamenEnPreparacion } from "./types";
import { examDisplayName } from "./format";
import { diasHasta } from "./fechas";

export { cuentaRegresiva, diasHasta, fechaLarga } from "./fechas";

export function evaluacionTipoLabel(examen: Pick<ExamenEnPreparacion, "kind" | "type">): string {
  if (examen.kind === "entrega") return "Entrega";
  if (examen.kind === "evento") return "Otro";
  if (examen.type === "final") return "Final";
  if (examen.type === "recuperatorio") return "Recuperatorio";
  if (examen.type === "parcial") return "Parcial";
  return "Examen";
}

export function evaluacionNombre(examen: ExamenEnPreparacion): string {
  return examDisplayName(examen);
}

export function ordenarEvaluaciones(examenes: ExamenEnPreparacion[]): ExamenEnPreparacion[] {
  return [...examenes].sort((a, b) => {
    const da = diasHasta(a.date);
    const db = diasHasta(b.date);
    const rank = (d: number | null) => (d === null ? 1 : d < 0 ? 2 : 0);
    if (rank(da) !== rank(db)) return rank(da) - rank(db);
    if (da !== null && db !== null) return rank(da) === 2 ? db - da : da - db;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function proximaEvaluacion(examenes: ExamenEnPreparacion[]): ExamenEnPreparacion | undefined {
  return ordenarEvaluaciones(examenes).find((e) => {
    const dias = diasHasta(e.date);
    return dias !== null && dias >= 0;
  });
}
