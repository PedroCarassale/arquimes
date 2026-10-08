"use client";

import type { ReactNode } from "react";
import { Icon, cx } from "@/components/ui";
import { TabLink } from "@/components/workspace/TabLink";
import { cuentaRegresiva, fechaCorta, formatHora, grupoAgenda } from "@/lib/fechas";
import { rutas } from "@/lib/routes";
import type { EventoResumen } from "@/lib/types";
import { MateriaDot } from "./EventChip";
import { kindIcon, tipoCorto } from "./eventos";

function agrupar(eventos: EventoResumen[]): { titulo: string; eventos: EventoResumen[] }[] {
  const grupos: { titulo: string; eventos: EventoResumen[] }[] = [];
  for (const evento of eventos) {
    const titulo = grupoAgenda(evento.date);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === titulo) ultimo.eventos.push(evento);
    else grupos.push({ titulo, eventos: [evento] });
  }
  const sinFecha = grupos.findIndex((grupo) => grupo.titulo === "Sin fecha");
  if (sinFecha >= 0 && sinFecha !== grupos.length - 1) grupos.push(...grupos.splice(sinFecha, 1));
  return grupos;
}

export function AgendaRow({
  evento,
  global,
  onPreview,
  onNavigate,
}: {
  evento: EventoResumen;
  global: boolean;
  onPreview?: (evento: EventoResumen, anchor: HTMLElement) => void;
  onNavigate?: () => void;
}) {
  const hora = formatHora(evento.hora);
  const cuenta = cuentaRegresiva(evento.date);
  const className =
    "group flex h-[52px] w-full min-w-0 items-center gap-3 rounded-md px-2 text-left transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover";
  const content: ReactNode = (
    <>
      <span className="flex w-12 shrink-0 flex-col font-mono text-[11px] leading-4">
        <span className="text-foreground">{fechaCorta(evento.date) ?? "—"}</span>
        {hora && <span className="text-foreground-subtle">{hora}</span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm leading-5 text-foreground">{evento.name}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-foreground-muted">
          <Icon name={kindIcon(evento.kind)} size={12} className="shrink-0" />
          <span className="shrink-0">{tipoCorto(evento)}</span>
          {global && (
            <>
              <span aria-hidden="true">·</span>
              <MateriaDot materiaId={evento.materiaId} />
              <span className="truncate">{evento.materiaName}</span>
            </>
          )}
        </span>
      </span>
      {cuenta && <span className="shrink-0 font-mono text-[11px] text-foreground-muted">{cuenta}</span>}
    </>
  );

  if (global) {
    return (
      <button type="button" onClick={(event) => onPreview?.(evento, event.currentTarget)} className={className}>
        {content}
      </button>
    );
  }
  return (
    <TabLink href={rutas.evento(evento.materiaId, evento.id)} onClick={onNavigate} className={className}>
      {content}
    </TabLink>
  );
}

export function Agenda({
  eventos,
  global,
  onPreview,
  empty,
  className,
}: {
  eventos: EventoResumen[];
  global: boolean;
  onPreview: (evento: EventoResumen, anchor: HTMLElement) => void;
  empty: ReactNode;
  className?: string;
}) {
  const grupos = agrupar(eventos);

  if (grupos.length === 0) return <div className={className}>{empty}</div>;

  return (
    <div className={cx("space-y-5", className)}>
      {grupos.map((grupo) => (
        <section key={grupo.titulo} aria-label={grupo.titulo}>
          <h3 className="t-meta px-2 pb-1">{grupo.titulo}</h3>
          <ul>
            {grupo.eventos.map((evento) => (
              <li key={evento.id}>
                <AgendaRow evento={evento} global={global} onPreview={onPreview} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
