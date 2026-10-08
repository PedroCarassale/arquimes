import type { ArtefactoTipo, LecturaArchivo } from "@/lib/types";
import { fechaCorta } from "@/lib/fechas";
import { fileIconName } from "@/components/ui/Icon";

const TIPO_LABEL = {
  pdf: "PDF",
  imagen: "Imagen",
  texto: "Texto",
  video: "Video",
  apunte: "Archivo",
} as const;

const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

export function tamanoArchivo(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb >= 10 ? Math.round(kb) : decimal.format(kb)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb >= 100 ? Math.round(mb) : decimal.format(mb)} MB`;
}

export function tipoArchivoLabel(type: string, name: string): string {
  return TIPO_LABEL[fileIconName(type, name)];
}

export function metaArchivo(file: { type: string; name: string; size: number; addedAt?: string; esExamen?: boolean }): string {
  return [
    file.esExamen ? "Examen" : null,
    tipoArchivoLabel(file.type, file.name),
    tamanoArchivo(file.size),
    fechaCorta(file.addedAt),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function metaGenerado(item: { tipo: ArtefactoTipo; version: number; updatedAt?: string }): string {
  return [item.tipo === "examen" ? "Examen del chat" : "Del chat", `v${item.version}`, fechaCorta(item.updatedAt)]
    .filter(Boolean)
    .join(" · ");
}

export function lecturaEstado(lectura?: LecturaArchivo): string | null {
  switch (lectura?.estado) {
    case "subiendo":
    case "leyendo":
      return "Leyendo…";
    case "lista":
      return "Listo para el chat";
    case "parcial":
      return "Leído en parte";
    case "sin-texto":
      return "Sin texto legible";
    default:
      return null;
  }
}

export function enLectura(lectura?: LecturaArchivo): boolean {
  return lectura?.estado === "subiendo" || lectura?.estado === "leyendo";
}
