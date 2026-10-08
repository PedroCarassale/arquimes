"use client";

import { useState } from "react";
import { formatFileSize } from "@/lib/format";
import { dismissUpload, useUploads, type UploadItem } from "@/lib/upload-queue";
import { cx } from "./ui/cx";
import { Icon } from "./ui/Icon";

function statusLabel(item: UploadItem): string {
  switch (item.status) {
    case "pendiente":
      return "En cola";
    case "subiendo":
      return item.fraction >= 0.99
        ? "Guardando…"
        : `Subiendo · ${Math.round(item.fraction * 100)}%`;
    case "lista":
      return item.kind === "examen" ? "Examen guardado" : "Guardado en Apuntes";
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
    <div className="fixed right-[60px] top-2 z-[35] w-[11.5rem] lg:right-4 lg:top-12 lg:w-80">
      <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-surface-overlay shadow-pop">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="subidas-lista"
          className="flex h-10 w-full items-center justify-between gap-3 px-3 text-left transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-foreground-subtle">
            Subidas
          </span>
          <span
            role="status"
            aria-live="polite"
            className={cx(
              "min-w-0 flex-1 truncate text-right font-mono text-[11px]",
              failed && !active.length ? "text-danger" : "text-foreground"
            )}
          >
            <span className="lg:hidden">{shortSummary}</span>
            <span className="hidden lg:inline">{summary}</span>
          </span>
          <Icon
            name="chevron-down"
            size={14}
            className={cx(
              "shrink-0 text-foreground-muted transition-transform duration-(--dur-fast) motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>
        {active.length > 0 && (
          <div className="h-px w-full bg-border-subtle">
            <div
              className="h-px bg-accent transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${Math.max(2, overall * 100)}%` }}
            />
          </div>
        )}
        {open && (
          <ul
            id="subidas-lista"
            className="max-h-[60vh] overflow-y-auto border-t border-border-subtle p-1 max-lg:fixed max-lg:right-[60px] max-lg:top-[52px] max-lg:w-[min(20rem,calc(100vw-76px))] max-lg:rounded-lg max-lg:border max-lg:border-white/[0.08] max-lg:bg-surface-overlay max-lg:shadow-pop"
          >
            {uploads.map((item) => (
              <li key={item.id} className="rounded-md px-2 py-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] leading-[18px]" title={item.name}>
                      {item.name}
                    </div>
                    <div
                      className={cx(
                        "mt-0.5 font-mono text-[11px]",
                        item.status === "error"
                          ? "text-danger [overflow-wrap:anywhere]"
                          : "text-foreground-subtle"
                      )}
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
                      className="-my-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xs text-foreground-muted transition-colors duration-(--dur-fast) hover:bg-hover hover:text-foreground pointer-coarse:h-10 pointer-coarse:w-10"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>
                {item.status === "subiendo" && (
                  <div className="mt-1.5 h-px w-full bg-border-subtle">
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
    </div>
  );
}
