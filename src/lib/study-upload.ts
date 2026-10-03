import { unzip } from "fflate";
import { apiFetch } from "./api";
import {
  fileExtension,
  isSupportedStudyFile,
  MAX_STUDY_FILE_BYTES,
  studyFileMimeType,
  studyFileTooBigMessage,
} from "./limits";
import type { ExamenEnPreparacion, LecturaArchivo, Material } from "./types";

export const LECTURA_EVENT = "arquimedes:lectura";

const PARALLEL_CHUNKS = 3;
const PARALLEL_READERS = 3;
const RETRIES = 3;

export type UploadResult = {
  fileId: string;
  lectura: LecturaArchivo;
  material?: Material;
  examen?: ExamenEnPreparacion;
};

export function validateStudyFile(file: File): string | null {
  if (!file) return "No se recibió ningún archivo.";
  if (file.size <= 0) return `“${file.name}” está vacío.`;
  if (file.size > MAX_STUDY_FILE_BYTES) return studyFileTooBigMessage(file.name);
  if (!isSupportedStudyFile(file.name)) {
    return `No pude guardar “${file.name}”: formato no compatible.`;
  }
  return null;
}

export function isZipFile(file: File): boolean {
  return fileExtension(file.name) === "zip" || file.type === "application/zip";
}

const CP850_HIGH =
  "\u00c7\u00fc\u00e9\u00e2\u00e4\u00e0\u00e5\u00e7\u00ea\u00eb\u00e8\u00ef\u00ee\u00ec\u00c4\u00c5" +
  "\u00c9\u00e6\u00c6\u00f4\u00f6\u00f2\u00fb\u00f9\u00ff\u00d6\u00dc\u00f8\u00a3\u00d8\u00d7\u0192" +
  "\u00e1\u00ed\u00f3\u00fa\u00f1\u00d1\u00aa\u00ba\u00bf\u00ae\u00ac\u00bd\u00bc\u00a1\u00ab\u00bb" +
  "\u2591\u2592\u2593\u2502\u2524\u00c1\u00c2\u00c0\u00a9\u2563\u2551\u2557\u255d\u00a2\u00a5\u2510" +
  "\u2514\u2534\u252c\u251c\u2500\u253c\u00e3\u00c3\u255a\u2554\u2569\u2566\u2560\u2550\u256c\u00a4" +
  "\u00f0\u00d0\u00ca\u00cb\u00c8\u0131\u00cd\u00ce\u00cf\u2518\u250c\u2588\u2584\u00a6\u00cc\u2580" +
  "\u00d3\u00df\u00d4\u00d2\u00f5\u00d5\u00b5\u00fe\u00de\u00da\u00db\u00d9\u00fd\u00dd\u00af\u00b4" +
  "\u00ad\u00b1\u2017\u00be\u00b6\u00a7\u00f7\u00b8\u00b0\u00a8\u00b7\u00b9\u00b3\u00b2\u25a0\u00a0";

function zipEntryNames(bytes: Uint8Array): Map<string, string> {
  const names = new Map<string, string>();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return names;
  const entries = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  for (let n = 0; n < entries && offset + 46 <= bytes.length; n += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const flag = view.getUint16(offset + 8, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const raw = bytes.subarray(offset + 46, offset + 46 + nameLength);
    if (!(flag & 0x800)) {
      const asLatin1 = String.fromCharCode(...raw);
      let proper: string;
      try {
        proper = utf8.decode(raw);
      } catch {
        proper = Array.from(raw, (byte) =>
          byte < 0x80 ? String.fromCharCode(byte) : CP850_HIGH[byte - 0x80]
        ).join("");
      }
      names.set(asLatin1, proper);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

export async function expandStudyFiles(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const file of files) {
    if (!isZipFile(file)) {
      out.push(file);
      continue;
    }
    const zipBytes = new Uint8Array(await file.arrayBuffer());
    const properNames = zipEntryNames(zipBytes);
    const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
      Promise.resolve()
        .then(() =>
          unzip(
            zipBytes,
            {
              filter: (entry) =>
                !entry.name.endsWith("/") &&
                !entry.name.startsWith("__MACOSX/") &&
                !entry.name.split("/").pop()!.startsWith(".") &&
                isSupportedStudyFile(entry.name),
            },
            (error, data) => (error ? reject(error) : resolve(data))
          )
        )
        .catch(reject);
    });
    const names = Object.keys(entries).sort((a, b) => a.localeCompare(b, "es"));
    if (names.length === 0) {
      throw new Error(`“${file.name}” no tiene archivos compatibles adentro.`);
    }
    for (const path of names) {
      const fullName = properNames.get(path) || path;
      const name = fullName.split("/").pop() || fullName;
      const bytes = entries[path];
      out.push(
        new File([bytes.slice().buffer as ArrayBuffer], name, {
          type: studyFileMimeType(name),
        })
      );
    }
  }
  return out;
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (typeof payload?.error === "string") return payload.error;
  if (response.status === 413) return `${fallback} El servidor rechazó el tamaño del envío.`;
  return fallback;
}

async function withRetries<T>(task: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function uploadStudyFile(
  materiaId: string,
  file: File,
  options: {
    kind: "apuntes" | "examen";
    note?: string;
    onProgress?: (fraction: number) => void;
  }
): Promise<UploadResult> {
  const invalid = validateStudyFile(file);
  if (invalid) throw new Error(invalid);

  const created = await apiFetch("/api/archivos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      materiaId,
      name: file.name,
      type: studyFileMimeType(file.name, file.type),
      size: file.size,
    }),
  });
  if (!created.ok) {
    throw new Error(await errorMessage(created, `No pude subir “${file.name}”.`));
  }
  const { fileId, chunkSize, chunkCount } = (await created.json()) as {
    fileId: string;
    chunkSize: number;
    chunkCount: number;
  };

  try {
    let sent = 0;
    let next = 0;
    options.onProgress?.(0);
    const worker = async () => {
      while (next < chunkCount) {
        const index = next;
        next += 1;
        const blob = file.slice(index * chunkSize, (index + 1) * chunkSize);
        await withRetries(async () => {
          const response = await apiFetch(`/api/archivos/${fileId}/bloques/${index}`, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: blob,
          });
          if (!response.ok) {
            throw new Error(await errorMessage(response, `No pude subir “${file.name}”.`));
          }
        });
        sent += blob.size;
        options.onProgress?.(sent / file.size);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL_CHUNKS, chunkCount) }, worker)
    );

    const completed = await apiFetch(`/api/archivos/${fileId}/completar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materiaId, kind: options.kind, note: options.note }),
    });
    if (!completed.ok) {
      throw new Error(await errorMessage(completed, `No pude guardar “${file.name}”.`));
    }
    const result = (await completed.json()) as UploadResult;
    if (result.lectura.estado === "leyendo") announceLectura(fileId, file.name);
    return result;
  } catch (error) {
    void apiFetch(`/api/archivos/${fileId}`, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
}

export function announceLectura(fileId: string, name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LECTURA_EVENT, { detail: { fileId, name } }));
}

const activeReads = new Map<string, Promise<LecturaArchivo>>();
const listeners = new Map<string, Set<(lectura: LecturaArchivo) => void>>();

export function onLecturaProgress(
  fileId: string,
  listener: (lectura: LecturaArchivo) => void
): () => void {
  const set = listeners.get(fileId) || new Set();
  set.add(listener);
  listeners.set(fileId, set);
  return () => set.delete(listener);
}

function emit(fileId: string, lectura: LecturaArchivo) {
  listeners.get(fileId)?.forEach((listener) => listener(lectura));
}

async function readLoop(fileId: string): Promise<LecturaArchivo> {
  let latest: LecturaArchivo = { estado: "leyendo", paginasLeidas: 0, paginasTotales: 0 };
  let idleRounds = 0;
  while (latest.estado === "leyendo" && idleRounds < 80) {
    let processedAny = false;
    const worker = async () => {
      for (;;) {
        const response = await withRetries(async () => {
          const res = await apiFetch(`/api/archivos/${fileId}/leer`, { method: "POST" });
          if (res.status === 404) return null;
          if (!res.ok) throw new Error(await errorMessage(res, "No pude leer el archivo."));
          return (await res.json()) as { lectura: LecturaArchivo; processed: boolean };
        });
        if (!response) {
          latest = { estado: "sin-texto", paginasLeidas: 0, paginasTotales: 0 };
          return;
        }
        if (response.lectura.paginasLeidas >= latest.paginasLeidas || response.lectura.estado !== "leyendo") {
          latest = response.lectura;
          emit(fileId, latest);
        }
        if (!response.processed || latest.estado !== "leyendo") return;
        processedAny = true;
      }
    };
    await Promise.all(Array.from({ length: PARALLEL_READERS }, worker));
    if (latest.estado === "leyendo") {
      idleRounds = processedAny ? 0 : idleRounds + 1;
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
  return latest;
}

export function readStudyFile(fileId: string): Promise<LecturaArchivo> {
  const running = activeReads.get(fileId);
  if (running) return running;
  const promise = readLoop(fileId).finally(() => activeReads.delete(fileId));
  activeReads.set(fileId, promise);
  return promise;
}

export async function rereadStudyFile(fileId: string, name: string): Promise<LecturaArchivo> {
  const response = await apiFetch(`/api/archivos/${fileId}/releer`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await errorMessage(response, `No pude volver a leer “${name}”.`));
  }
  const { lectura } = (await response.json()) as { lectura: LecturaArchivo };
  if (lectura.estado === "leyendo") announceLectura(fileId, name);
  return lectura;
}
