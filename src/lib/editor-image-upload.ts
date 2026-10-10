import { v4 as uuid } from "uuid";
import { apiFetch } from "./api";
import { editorImageError, editorImageUrl } from "./editor-images";

const RETRIES = 3;
const GENERIC = "No pude subir la imagen. Revisá la conexión y probá de nuevo.";

async function errorFrom(response: Response): Promise<Error> {
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (typeof payload?.error === "string") return new Error(payload.error);
  if (response.status === 413) return new Error("No pude subir la imagen: es demasiado grande.");
  return new Error(GENERIC);
}

async function putChunk(url: string, chunk: Blob): Promise<void> {
  let last: Error = new Error(GENERIC);
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const response = await apiFetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: chunk,
    }).catch(() => null);
    if (response?.ok) return;
    if (response && response.status < 500) throw await errorFrom(response);
    last = response ? await errorFrom(response) : new Error(GENERIC);
    await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
  }
  throw last;
}

export function discardEditorImage(url: string, { faltante = false } = {}): Promise<boolean> {
  return apiFetch(faltante ? `${url}?faltante=1` : url, { method: "DELETE" }).then(
    (response) => response.ok,
    () => false
  );
}

export function startEditorImageUpload(image: Blob): { url: string; done: Promise<void> } {
  const invalid = editorImageError(image.type, image.size);
  if (invalid) throw new Error(invalid);
  const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : uuid();
  const url = editorImageUrl(id);
  const done = (async () => {
    try {
      const created = await apiFetch("/api/imagenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type: image.type, size: image.size }),
      }).catch(() => null);
      if (!created) throw new Error(GENERIC);
      if (!created.ok) throw await errorFrom(created);
      const { fileId, chunkSize, chunkCount } = (await created.json()) as {
        fileId: string;
        chunkSize: number;
        chunkCount: number;
      };
      for (let index = 0; index < chunkCount; index += 1) {
        await putChunk(`/api/archivos/${fileId}/bloques/${index}`, image.slice(index * chunkSize, (index + 1) * chunkSize));
      }
      const finished = await apiFetch(`/api/imagenes/${fileId}`, { method: "POST" }).catch(() => null);
      if (!finished) throw new Error(GENERIC);
      if (!finished.ok) throw await errorFrom(finished);
    } catch (error) {
      void discardEditorImage(url);
      throw error;
    }
  })();
  return { url, done };
}
