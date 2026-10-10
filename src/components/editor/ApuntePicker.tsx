"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Icon, apunteIconName, cx } from "@/components/ui";
import type { ApunteReferencia } from "@/lib/apunte-referencias";

export type PickerAnchor = { left: number; top: number; bottom: number };

export type PickerSnapshot = {
  open: boolean;
  query: string;
  anchor: PickerAnchor | null;
  status: "idle" | "loading" | "ready" | "error";
  results: ApunteReferencia[];
  total: number;
  active: number;
};

export type PickerStore = {
  subscribe: (listener: () => void) => () => void;
  get: () => PickerSnapshot;
};

const WIDTH = 300;
const GAP = 6;
const GUTTER = 8;
const MAX_HEIGHT = 288;

function etiqueta(referencia: ApunteReferencia): string {
  const item = referencia.item;
  if (item.origen === "generado") return item.tipo === "examen" ? "Simulacro" : "Pergamino";
  if (item.esExamen) return "Examen";
  const extension = item.name.includes(".") ? item.name.split(".").pop() : "";
  return extension && extension.length <= 5 ? extension.toUpperCase() : "Archivo";
}

function posicion(anchor: PickerAnchor): { left: number; top?: number; bottom?: number; maxHeight: number } {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const left = Math.max(GUTTER, Math.min(anchor.left, width - WIDTH - GUTTER));
  const below = height - anchor.bottom - GAP - GUTTER;
  const above = anchor.top - GAP - GUTTER;
  if (below >= Math.min(MAX_HEIGHT, 160) || below >= above) {
    return { left, top: anchor.bottom + GAP, maxHeight: Math.min(MAX_HEIGHT, below) };
  }
  return { left, bottom: height - anchor.top + GAP, maxHeight: Math.min(MAX_HEIGHT, above) };
}

export function ApuntePicker({
  store,
  onPick,
  onHover,
}: {
  store: PickerStore;
  onPick: (referencia: ApunteReferencia) => void;
  onHover: (index: number) => void;
}) {
  const snapshot = useSyncExternalStore(store.subscribe, store.get, store.get);
  const listRef = useRef<HTMLDivElement>(null);
  const { open, anchor, results, active, status, query, total } = snapshot;

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, results]);

  if (!open || !anchor) return null;
  const { left, top, bottom, maxHeight } = posicion(anchor);
  const vacio =
    status === "error"
      ? "No se pudieron cargar los apuntes."
      : status !== "ready" && !results.length
        ? "Cargando apuntes…"
        : total === 0
          ? "Todavía no hay apuntes en esta materia."
          : `Ningún apunte coincide con «${query.trim()}».`;

  return (
    <div
      data-arq-apunte-picker=""
      onMouseDown={(event) => event.preventDefault()}
      style={{ left, top, bottom, width: WIDTH, maxHeight }}
      className="t-pop-in fixed z-[60] flex flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-surface-overlay text-sm shadow-pop"
    >
      <div className="shrink-0 px-3 pb-1 pt-2.5 font-mono text-[11px] leading-4 tracking-[0.06em] text-foreground-subtle">
        Referencia a un apunte
      </div>
      <div ref={listRef} role="listbox" aria-label="Apuntes de la materia" className="min-h-0 overflow-y-auto p-1">
        {results.length === 0 ? (
          <p className="px-2 py-2 text-[13px] leading-5 text-foreground-muted">{vacio}</p>
        ) : (
          results.map((referencia, index) => (
            <div
              key={referencia.key}
              role="option"
              aria-selected={index === active}
              data-index={index}
              onMouseMove={() => {
                if (index !== active) onHover(index);
              }}
              onClick={() => onPick(referencia)}
              className={cx(
                "flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-foreground pointer-coarse:h-10",
                index === active && "bg-selected"
              )}
            >
              <Icon name={apunteIconName(referencia.item)} size={16} className="text-foreground-muted" />
              <span className="min-w-0 flex-1 truncate">{referencia.nombre}</span>
              <span className="shrink-0 font-mono text-[11px] text-foreground-subtle">{etiqueta(referencia)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
