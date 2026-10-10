export const MAX_EDITOR_IMAGE_BYTES = 20 * 1024 * 1024;

export const EDITOR_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function editorImageError(type: string, size: number): string | null {
  if (!EDITOR_IMAGE_TYPES[type]) return "No pude subir la imagen: el formato no es compatible (usá PNG, JPG, GIF o WebP).";
  if (size <= 0) return "No pude subir la imagen: está vacía.";
  if (size > MAX_EDITOR_IMAGE_BYTES) return "No pude subir la imagen: supera el límite de 20 MB.";
  return null;
}

export function editorImageName(type: string): string {
  return `imagen.${EDITOR_IMAGE_TYPES[type] ?? "png"}`;
}

export function editorImageUrl(fileId: string): string {
  return `/api/imagenes/${fileId}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const FILE_ID = new RegExp(`^${UUID}$`, "i");
const EDITOR_IMAGE_ID = new RegExp(`/api/imagenes/(${UUID})(?![\\w-])`, "gi");

export function isEditorImageId(value: unknown): value is string {
  return typeof value === "string" && FILE_ID.test(value);
}

export function editorImageIdFromSrc(src: unknown): string | null {
  if (typeof src !== "string") return null;
  const id = src.trim().match(/^\/api\/imagenes\/([^/?#\s]+)$/)?.[1];
  return isEditorImageId(id) ? id : null;
}

export function editorImageIds(markdown: string): string[] {
  return [...new Set(Array.from(markdown.matchAll(EDITOR_IMAGE_ID), (match) => match[1].toLowerCase()))];
}

export function captionFromAlt(alt: string | null | undefined, title: string | null | undefined): { alt: string; title: string } {
  const text = alt?.trim() ?? "";
  if (title || !text || Number.isFinite(Number(text))) return { alt: alt ?? "", title: title ?? "" };
  return { alt: "", title: text };
}

export function isPendingImageSrc(src: unknown): src is string {
  return typeof src === "string" && /^(?:blob|data):/i.test(src.trim());
}

const PENDING_IMAGE = /!\[[^\]\n]*\]\(\s*<?(?:blob|data):[^)\s>]*>?(?:\s+"[^"\n]*")?\s*\)/gi;

function stripImages(markdown: string, pattern: RegExp): string {
  const lines: string[] = [];
  let fence: string | null = null;
  for (const line of markdown.split("\n")) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1] ?? null;
    if (fence) {
      lines.push(line);
      if (marker && marker[0] === fence[0] && marker.length >= fence.length && !line.trim().slice(marker.length)) fence = null;
      continue;
    }
    if (marker) {
      fence = marker;
      lines.push(line);
      continue;
    }
    const stripped = line.replace(pattern, "");
    if (stripped === line) {
      lines.push(line);
      continue;
    }
    if (stripped.trim()) {
      lines.push(stripped.trimEnd());
      continue;
    }
    if (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
  }
  return lines.join("\n");
}

export function withoutPendingImages(markdown: string): string {
  if (!/\]\(\s*<?(?:blob|data):/i.test(markdown)) return markdown;
  return stripImages(markdown, PENDING_IMAGE);
}

export function withoutEditorImage(markdown: string, fileId: string): string {
  if (!isEditorImageId(fileId)) return markdown;
  const url = editorImageUrl(fileId);
  if (!markdown.toLowerCase().includes(url.toLowerCase())) return markdown;
  return stripImages(markdown, new RegExp(`!\\[[^\\]\\n]*\\]\\(\\s*<?${url}>?(?:\\s+"[^"\\n]*")?\\s*\\)`, "gi"));
}
