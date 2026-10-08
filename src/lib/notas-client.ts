import { apiFetch } from "./api";
import type { Nota } from "./types";

export async function crearNota(
  materiaId: string,
  input: { titulo?: string; contenido?: string } = {}
): Promise<Nota> {
  const response = await apiFetch(`/api/materias/${materiaId}/notas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo: input.titulo ?? "", contenido: input.contenido ?? "" }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No se pudo crear la clase.");
  return payload as Nota;
}

export function descargarMarkdown(nombre: string, contenido: string) {
  const blob = new Blob([contenido], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nombre.replace(/[\\/:*?"<>|]+/g, "-").trim() || "documento"}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

export function relativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
