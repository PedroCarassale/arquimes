"use client";

import { useState } from "react";
import { formatFileSize } from "@/lib/format";
import { dismissUpload, useUploads, type UploadItem } from "@/lib/upload-queue";

function statusLabel(item: UploadItem): string {
  switch (item.status) {
    case "pendiente":
      return "En cola";
    case "subiendo":
      return item.fraction >= 0.99
        ? "Guardando…"
        : `Subiendo · ${Math.round(item.fraction * 100)}%`;
    case "lista":
      return item.kind === "examen" ? "Examen guardado" : "Apunte guardado";
    case "error":
      return item.error || "No se pudo subir";
  }
}

export function SubidasPanel() {
  const uploads = useUploads();
  const [open, setOpen] = useState(true);

  if (uploads.length === 0) return null;

  const active = uploads.filter(
    (item) => item.status === "pendiente" || item.status === "subiendo"
  );
  const failed = uploads.filter((item) => item.status === "error").length;
  const totalBytes = active.reduce((sum, item) => sum + item.size, 0);
  const sentBytes = active.reduce((sum, item) => sum + item.size * item.fraction, 0);
  const overall = totalBytes ? sentBytes / totalBytes : 1;
  const summary = active.length
    ? `Subiendo ${active.length} ${active.length === 1 ? "archivo" : "archivos"} · ${Math.round(overall * 100)}%`
    : failed
      ? `${failed} ${failed === 1 ? "subida falló" : "subidas fallaron"}`
      : "Subidas completas";
  const shortSummary = active.length
    ? `${active.length} · ${Math.round(overall * 100)}%`
    : failed
      ? `${failed} con error`
      : "Listas";

  return (
    <div className="fixed right-[60px] top-2 z-[35] w-[11.5rem] lg:right-6 lg:top-4 lg:w-80">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="subidas-lista"
        className="flex h-10 w-full items-center justify-between gap-3 border border-border bg-surface-elevated px-3 text-left shadow-lg"
      >
        <span className="text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
          Subidas
        </span>
        <span
          role="status"
          aria-live="polite"
          className={`min-w-0 flex-1 truncate text-right font-mono text-[11px] ${
            failed && !active.length ? "text-red-400" : "text-foreground"
          }`}
        >
          <span className="lg:hidden">{shortSummary}</span>
          <span className="hidden lg:inline">{summary}</span>
        </span>
        <span aria-hidden="true" className="text-xs text-foreground-muted">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {active.length > 0 && (
        <div className="h-px w-full bg-border">
          <div
            className="h-px bg-accent transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${Math.max(2, overall * 100)}%` }}
          />
        </div>
      )}
      {open && (
        <ul
          id="subidas-lista"
          className="absolute right-0 top-full max-h-[60vh] w-[min(20rem,calc(100vw-76px))] overflow-y-auto border border-t-0 border-border bg-surface-elevated shadow-lg lg:static lg:w-full"
        >
          {uploads.map((item) => (
            <li key={item.id} className="border-b border-border-subtle px-3 py-2 last:border-b-0">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm" title={item.name}>
                    {item.name}
                  </div>
                  <div
                    className={`mt-0.5 font-mono text-[11px] ${
                      item.status === "error"
                        ? "text-red-400 [overflow-wrap:anywhere]"
                        : item.status === "subiendo"
                          ? "text-accent"
                          : "text-foreground-muted"
                    }`}
                  >
                    {statusLabel(item)}
                    {item.status !== "error" && ` · ${formatFileSize(item.size)}`}
                  </div>
                </div>
                {(item.status === "error" || item.status === "pendiente") && (
                  <button
                    type="button"
                    onClick={() => dismissUpload(item.id)}
                    aria-label={
                      item.status === "error" ? `Descartar ${item.name}` : `Cancelar ${item.name}`
                    }
                    className="-my-1 shrink-0 px-1 py-1 text-base text-foreground-muted hover:text-foreground"
                  >
                    ×
                  </button>
                )}
              </div>
              {item.status === "subiendo" && (
                <div className="mt-1.5 h-px w-full bg-border">
                  <div
                    className="h-px bg-accent transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${Math.max(2, item.fraction * 100)}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
