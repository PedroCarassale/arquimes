import type { ExamenEnPreparacion } from "./types";
import { examDisplayName } from "./format";

export function evaluacionTipoLabel(examen: ExamenEnPreparacion): string {
  if (examen.kind === "entrega") return "Entrega";
  if (examen.type === "final") return "Final";
  if (examen.type === "parcial") return "Parcial";
  return "Examen";
}

export function evaluacionNombre(examen: ExamenEnPreparacion): string {
  return examDisplayName(examen);
}

export function diasHasta(date?: string, now = new Date()): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function cuentaRegresiva(date?: string): string | null {
  const dias = diasHasta(date);
  if (dias === null) return null;
  if (dias < -1) return `hace ${-dias} días`;
  if (dias === -1) return "fue ayer";
  if (dias === 0) return "es hoy";
  if (dias === 1) return "es mañana";
  return `en ${dias} días`;
}

export function fechaLarga(date?: string): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const texto = new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
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
