import type { ExamenEnPreparacion } from "./types";

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    const rounded = kb >= 10 ? kb.toFixed(0) : kb.toFixed(1);
    return `${rounded} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function examTypeLabel(type: ExamenEnPreparacion["type"]): string {
  return type === "parcial" ? "Parcial" : "Final";
}

export function examDisplayName(exam: ExamenEnPreparacion): string {
  const name = exam.name?.trim();
  return name || examTypeLabel(exam.type);
}

export function formatExamDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
