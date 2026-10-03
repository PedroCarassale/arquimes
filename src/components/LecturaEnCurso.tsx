"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { lecturaLabel } from "@/lib/format";
import {
  LECTURA_EVENT,
  onLecturaProgress,
  readStudyFile,
} from "@/lib/study-upload";
import type { LecturaArchivo } from "@/lib/types";

type Item = { fileId: string; name: string; lectura: LecturaArchivo };

export function LecturaEnCurso() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let alive = true;
    const unsubscribers = new Map<string, () => void>();

    const track = (fileId: string, name: string, lectura?: LecturaArchivo) => {
      if (unsubscribers.has(fileId)) return;
      setItems((current) =>
        current.some((item) => item.fileId === fileId)
          ? current
          : [
              ...current,
              {
                fileId,
                name,
                lectura: lectura || { estado: "leyendo", paginasLeidas: 0, paginasTotales: 0 },
              },
            ]
      );
      const update = (next: LecturaArchivo) => {
        if (!alive) return;
        setItems((current) =>
          current.map((item) => (item.fileId === fileId ? { ...item, lectura: next } : item))
        );
      };
      unsubscribers.set(fileId, onLecturaProgress(fileId, update));
      void readStudyFile(fileId).then((final) => {
        update(final);
        setTimeout(() => {
          if (!alive) return;
          unsubscribers.get(fileId)?.();
          unsubscribers.delete(fileId);
          setItems((current) => current.filter((item) => item.fileId !== fileId));
        }, 5_000);
      });
    };

    apiFetch("/api/archivos")
      .then((response) => (response.ok ? response.json() : { leyendo: [] }))
      .then((payload: { leyendo?: Item[] }) => {
        if (!alive) return;
        payload.leyendo?.forEach((item) => track(item.fileId, item.name, item.lectura));
      })
      .catch(() => undefined);

    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<{ fileId: string; name: string }>).detail;
      if (detail?.fileId) track(detail.fileId, detail.name);
    };
    window.addEventListener(LECTURA_EVENT, onAnnounce);
    return () => {
      alive = false;
      window.removeEventListener(LECTURA_EVENT, onAnnounce);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-40 border border-border bg-surface-elevated p-3 shadow-lg sm:left-auto sm:right-6 sm:w-80"
    >
      <div className="mb-2 text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
        Leyendo material para el chat
      </div>
      <ul className="space-y-3">
        {items.map((item) => {
          const { paginasLeidas, paginasTotales, estado } = item.lectura;
          const fraction =
            estado === "leyendo" ? (paginasTotales ? paginasLeidas / paginasTotales : 0) : 1;
          return (
            <li key={item.fileId}>
              <div className="truncate text-sm" title={item.name}>
                {item.name}
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-foreground-muted">
                <span>{lecturaLabel(item.lectura)}</span>
                {estado === "leyendo" && <span>{Math.round(fraction * 100)}%</span>}
              </div>
              <div className="mt-1 h-px w-full bg-border">
                <div
                  className="h-px bg-accent transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${Math.max(2, fraction * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-foreground-subtle">
        Podés seguir usando la app. Si cerrás la pestaña, la lectura sigue la próxima vez que entres.
      </p>
    </div>
  );
}
