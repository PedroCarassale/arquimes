"use client";

import type { MouseEvent } from "react";
import { Icon, cx } from "@/components/ui";
import { TabLink } from "@/components/workspace/TabLink";
import { formatHora } from "@/lib/fechas";
import { materiaTone } from "@/lib/materia-tone";
import { rutas } from "@/lib/routes";
import type { EventoResumen } from "@/lib/types";
import { kindIcon } from "./eventos";

export function MateriaDot({ materiaId, className }: { materiaId: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("inline-block h-1.5 w-1.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: materiaTone(materiaId).color }}
    />
  );
}

export function EventChip({
  evento,
  global,
  onPreview,
}: {
  evento: EventoResumen;
  global: boolean;
  onPreview?: (evento: EventoResumen, anchor: HTMLElement) => void;
}) {
  const hora = formatHora(evento.hora);
  const className =
    "flex h-5 w-full min-w-0 items-center gap-1 rounded-sm bg-hover px-1.5 text-left text-xs leading-5 text-foreground transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-selected";
  const content = (
    <>
      {global && <MateriaDot materiaId={evento.materiaId} />}
      {hora ? (
        <span className="shrink-0 font-mono text-[11px] text-foreground-muted">{hora}</span>
      ) : (
        <Icon name={kindIcon(evento.kind)} size={12} className="shrink-0 text-foreground-muted" />
      )}
      <span className="min-w-0 flex-1 truncate">{evento.name}</span>
    </>
  );
  const title = global ? `${evento.name} · ${evento.materiaName}` : evento.name;

  if (global) {
    return (
      <button
        type="button"
        title={title}
        onClick={(event: MouseEvent<HTMLButtonElement>) => onPreview?.(evento, event.currentTarget)}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <TabLink href={rutas.evento(evento.materiaId, evento.id)} title={title} className={className}>
      {content}
    </TabLink>
  );
}
