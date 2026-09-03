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

export function examTypeLabel(
  type: ExamenEnPreparacion["type"] | undefined
): string {
  if (type === "final") return "Final";
  if (type === "parcial") return "Parcial";
  return "Examen";
}

export function examDisplayName(exam: ExamenEnPreparacion): string {
  const name = exam.name?.trim();
  if (name) return name;
  if (exam.fileName?.trim()) return exam.fileName.trim();
  return examTypeLabel(exam.type);
}

export function formatExamDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
