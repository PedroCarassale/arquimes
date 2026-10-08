"use client";

import { createContext, useContext, type MouseEvent } from "react";
import { Icon, cx } from "@/components/ui";
import { TabLink } from "@/components/workspace/TabLink";
import { formatHora } from "@/lib/fechas";
import { materiaTone, type MateriaTones } from "@/lib/materia-tone";
import { rutas } from "@/lib/routes";
import type { EventoResumen } from "@/lib/types";
import { kindIcon } from "./eventos";

export const MateriaTonesContext = createContext<MateriaTones | undefined>(undefined);

export function MateriaDot({ materiaId, className }: { materiaId: string; className?: string }) {
  const tones = useContext(MateriaTonesContext);
  return (
    <span
      aria-hidden="true"
      className={cx("inline-block h-1.5 w-1.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: materiaTone(materiaId, tones).color }}
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
    "flex min-h-5 w-full min-w-0 items-start gap-1 rounded-sm bg-hover px-1.5 py-0.5 text-left text-xs leading-4 text-foreground transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-selected";
  const content = (
    <>
      {global && <MateriaDot materiaId={evento.materiaId} className="mt-[5px]" />}
      <span className="hidden h-4 shrink-0 items-center font-mono text-[11px] text-foreground-muted @min-[128px]:flex">
        {hora ?? <Icon name={kindIcon(evento.kind)} size={12} />}
      </span>
      <span className="line-clamp-2 min-w-0 flex-1 break-words @min-[128px]:line-clamp-1">{evento.name}</span>
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
