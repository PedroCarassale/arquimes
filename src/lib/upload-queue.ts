import { useSyncExternalStore } from "react";
import { uploadStudyFile, type UploadResult } from "./study-upload";

export type UploadKind = "apuntes" | "examen";

export type UploadItem = {
  id: string;
  materiaId: string;
  kind: UploadKind;
  name: string;
  size: number;
  status: "pendiente" | "subiendo" | "lista" | "error";
  fraction: number;
  error?: string;
};

type Job = {
  item: UploadItem;
  file: File;
  note?: string;
  resolve: (result: UploadResult) => void;
  reject: (error: unknown) => void;
};

const FINISHED_VISIBLE_MS = 4_000;
const EMPTY: UploadItem[] = [];

let items: UploadItem[] = EMPTY;
const queue: Job[] = [];
const listeners = new Set<() => void>();
const completionListeners = new Set<(item: UploadItem, result: UploadResult) => void>();
let running = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function patch(id: string, changes: Partial<UploadItem>) {
  items = items.map((item) => (item.id === id ? { ...item, ...changes } : item));
  emit();
}

function remove(id: string) {
  items = items.filter((item) => item.id !== id);
  if (items.length === 0) items = EMPTY;
  emit();
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
}

function syncUnloadGuard() {
  if (typeof window === "undefined") return;
  if (queue.length > 0 || running) {
    window.addEventListener("beforeunload", onBeforeUnload);
  } else {
    window.removeEventListener("beforeunload", onBeforeUnload);
  }
}

async function drain() {
  if (running) return;
  running = true;
  syncUnloadGuard();
  while (queue.length > 0) {
    const job = queue.shift()!;
    const { id } = job.item;
    patch(id, { status: "subiendo", fraction: 0 });
    try {
      const result = await uploadStudyFile(job.item.materiaId, job.file, {
        kind: job.item.kind,
        note: job.note,
        onProgress: (fraction) => patch(id, { fraction }),
      });
      patch(id, { status: "lista", fraction: 1 });
      const done = items.find((item) => item.id === id);
      if (done) completionListeners.forEach((listener) => listener(done, result));
      setTimeout(() => remove(id), FINISHED_VISIBLE_MS);
      job.resolve(result);
    } catch (error) {
      patch(id, {
        status: "error",
        error: error instanceof Error ? error.message : `No pude subir “${job.file.name}”.`,
      });
      job.reject(error);
    }
  }
  running = false;
  syncUnloadGuard();
}

export function enqueueUploads(
  materiaId: string,
  files: File[],
  options: { kind: UploadKind; note?: string }
): Promise<UploadResult>[] {
  const promises = files.map(
    (file) =>
      new Promise<UploadResult>((resolve, reject) => {
        const item: UploadItem = {
          id: crypto.randomUUID(),
          materiaId,
          kind: options.kind,
          name: file.name,
          size: file.size,
          status: "pendiente",
          fraction: 0,
        };
        items = [...items, item];
        queue.push({ item, file, note: options.note, resolve, reject });
      })
  );
  promises.forEach((promise) => promise.catch(() => undefined));
  emit();
  void drain();
  return promises;
}

export function dismissUpload(id: string) {
  const index = queue.findIndex((job) => job.item.id === id);
  if (index >= 0) {
    const [job] = queue.splice(index, 1);
    job.reject(new Error("Subida cancelada."));
  }
  remove(id);
}

export function onUploadComplete(
  listener: (item: UploadItem, result: UploadResult) => void
): () => void {
  completionListeners.add(listener);
  return () => completionListeners.delete(listener);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUploads(): UploadItem[] {
  return useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY
  );
}

export function usePendingUploads(materiaId: string, kind: UploadKind): UploadItem[] {
  return useUploads().filter(
    (item) =>
      item.materiaId === materiaId &&
      item.kind === kind &&
      (item.status === "pendiente" || item.status === "subiendo")
  );
}
