"use client";

import { cx } from "@/components/ui";
import { fechaLarga } from "@/lib/fechas";
import type { EventoResumen } from "@/lib/types";
import { MateriaDot } from "./EventChip";
import { DIAS_SEMANA } from "./eventos";

export function WeekStrip({
  dias,
  hoy,
  porDia,
  global,
  onDay,
  className,
}: {
  dias: string[];
  hoy: string;
  porDia: Map<string, EventoResumen[]>;
  global: boolean;
  onDay: (fecha: string, anchor: HTMLElement) => void;
  className?: string;
}) {
  return (
    <div className={cx("grid grid-cols-7 gap-1", className)}>
      {dias.map((ymd, index) => {
        const eventos = porDia.get(ymd) ?? [];
        const esHoy = ymd === hoy;
        const larga = fechaLarga(ymd) ?? ymd;
        return (
          <button
            key={ymd}
            type="button"
            onClick={(event) => onDay(ymd, event.currentTarget)}
            aria-label={
              eventos.length > 0
                ? `${larga}: ${eventos.length} ${eventos.length === 1 ? "evento" : "eventos"}`
                : `${larga}: nuevo evento`
            }
            className={cx(
              "flex h-11 flex-col items-center justify-center gap-0.5 rounded-md transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover",
              ymd < hoy && "opacity-60"
            )}
          >
            <span className="font-mono text-[11px] leading-3 text-foreground-subtle">{DIAS_SEMANA[index]}</span>
            <span
              className={cx(
                "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[13px] leading-none tabular-nums",
                esHoy ? "bg-accent font-medium text-[#0a0a0a]" : "text-foreground"
              )}
            >
              {Number(ymd.slice(8))}
            </span>
            <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
              {eventos.slice(0, 3).map((evento) =>
                global ? (
                  <MateriaDot key={evento.id} materiaId={evento.materiaId} />
                ) : (
                  <span key={evento.id} className="h-1.5 w-1.5 rounded-full bg-foreground-muted" />
                )
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
