import type { ExamenEnPreparacion, LecturaArchivo } from "./types";

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
  if (type === "recuperatorio") return "Recuperatorio";
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

export function lecturaLabel(lectura?: LecturaArchivo): string | null {
  if (!lectura) return null;
  const pages = (count: number) => `${count} ${count === 1 ? "página" : "páginas"}`;
  switch (lectura.estado) {
    case "subiendo":
      return "Subiendo…";
    case "leyendo":
      return lectura.paginasTotales > 1
        ? `Leyendo · ${lectura.paginasLeidas}/${lectura.paginasTotales} págs.`
        : "Leyendo…";
    case "lista":
      return lectura.paginasTotales > 1 ? `Texto listo · ${pages(lectura.paginasTotales)}` : "Texto listo";
    case "parcial":
      return `Lectura parcial · ${lectura.paginasLeidas}/${lectura.paginasTotales} págs.`;
    case "sin-texto":
      return "Sin texto legible";
    case "no-aplica":
      return null;
  }
}
