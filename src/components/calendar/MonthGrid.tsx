"use client";

import { cx } from "@/components/ui";
import { fechaLarga, mesGrid } from "@/lib/fechas";
import type { EventoResumen } from "@/lib/types";
import { EventChip, MateriaDot } from "./EventChip";
import { DIAS_SEMANA } from "./eventos";

const MAX_CHIPS = 2;

export function MonthGrid({
  mes,
  hoy,
  porDia,
  global,
  isMobile,
  onCreate,
  onDay,
  onPreview,
}: {
  mes: string;
  hoy: string;
  porDia: Map<string, EventoResumen[]>;
  global: boolean;
  isMobile: boolean;
  onCreate: (fecha: string, anchor: HTMLElement) => void;
  onDay: (fecha: string, anchor: HTMLElement) => void;
  onPreview: (evento: EventoResumen, anchor: HTMLElement) => void;
}) {
  const cells = mesGrid(mes);

  return (
    <div className="min-w-0">
      <div className="grid grid-cols-7 pb-1.5" aria-hidden="true">
        {DIAS_SEMANA.map((dia) => (
          <span key={dia} className="px-2 font-mono text-[11px] leading-4 text-foreground-muted">
            {dia}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle">
        {cells.map(({ ymd, enMes }) => {
          const eventos = porDia.get(ymd) ?? [];
          const esHoy = ymd === hoy;
          const pasado = ymd < hoy;
          const visibles = eventos.slice(0, MAX_CHIPS);
          const ocultos = eventos.length - visibles.length;
          const larga = fechaLarga(ymd) ?? ymd;
          const etiqueta =
            eventos.length > 0
              ? `${larga}: ${eventos.length} ${eventos.length === 1 ? "evento" : "eventos"}`
              : `${larga}: nuevo evento`;
          return (
            <div
              key={ymd}
              data-cell={ymd}
              data-today={esHoy || undefined}
              className="relative min-h-[104px] bg-background max-md:min-h-16"
            >
              <button
                type="button"
                aria-label={etiqueta}
                onClick={(event) => {
                  const cell = event.currentTarget.parentElement as HTMLElement;
                  if (isMobile && eventos.length > 0) onDay(ymd, cell);
                  else onCreate(ymd, cell);
                }}
                className="absolute inset-0 transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover focus-visible:shadow-[inset_0_0_0_2px_var(--ring)]"
              />
              <div
                className={cx(
                  "pointer-events-none relative flex h-full flex-col gap-1 p-1.5",
                  !enMes ? "opacity-35" : pasado ? "opacity-60" : undefined
                )}
              >
                <span
                  className={cx(
                    "inline-flex h-[22px] min-w-[22px] items-center justify-center self-start rounded-full px-1 text-[13px] leading-none tabular-nums",
                    esHoy ? "bg-accent font-medium text-[#0a0a0a]" : "text-foreground-muted"
                  )}
                >
                  {Number(ymd.slice(8))}
                </span>
                {eventos.length > 0 && (
                  <>
                    <div className="pointer-events-auto flex min-w-0 flex-col gap-0.5 max-md:hidden">
                      {visibles.map((evento) => (
                        <EventChip key={evento.id} evento={evento} global={global} onPreview={onPreview} />
                      ))}
                      {ocultos > 0 && (
                        <button
                          type="button"
                          onClick={(event) => onDay(ymd, event.currentTarget.closest("[data-cell]") as HTMLElement)}
                          className="flex h-5 items-center rounded-sm px-1.5 text-left text-xs text-foreground-muted transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover hover:text-foreground"
                        >
                          +{ocultos} más
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 px-1 md:hidden" aria-hidden="true">
                      {eventos.slice(0, 4).map((evento) =>
                        global ? (
                          <MateriaDot key={evento.id} materiaId={evento.materiaId} />
                        ) : (
                          <span key={evento.id} className="h-1.5 w-1.5 rounded-full bg-foreground-muted" />
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
