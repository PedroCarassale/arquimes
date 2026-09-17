export type MaterialViewerKind = "pdf" | "image" | "text" | "unsupported";

const textExtensions = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "json",
  "xml",
  "log",
  "tex",
]);

export function inferMaterialViewerKind(
  mimeType: string,
  fileName: string
): MaterialViewerKind {
  const mime = (mimeType || "").toLowerCase();
  const lowerName = fileName.toLowerCase();
  const extension = lowerName.includes(".")
    ? lowerName.split(".").pop() || ""
    : "";

  if (mime.includes("pdf") || extension === "pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("text/")) return "text";
  if (
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("javascript") ||
    mime.includes("typescript")
  ) {
    return "text";
  }
  if (textExtensions.has(extension)) return "text";
  return "unsupported";
}

export function materialFileUrl(
  materiaId: string,
  materialId: string,
  options?: { download?: boolean }
): string {
  const base = `/api/materias/${materiaId}/materiales/${materialId}/archivo`;
  if (options?.download) return `${base}?download=1`;
  return base;
}

export function materialViewerRoute(input: {
  materiaId: string;
  materialId: string;
  volver?: string;
  etiqueta?: string;
}): string {
  const base = `/materias/${input.materiaId}/materiales/${input.materialId}`;
  const params = new URLSearchParams();
  if (input.volver) params.set("volver", input.volver);
  if (input.etiqueta) params.set("etiqueta", input.etiqueta);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
