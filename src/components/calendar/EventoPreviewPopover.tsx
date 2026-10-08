"use client";

import { useEffect, useState } from "react";
import { ButtonLink, Icon, Pill, Popover } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { fechaLarga, formatHora } from "@/lib/fechas";
import { rutas } from "@/lib/routes";
import type { EventoResumen, Tema } from "@/lib/types";
import { MateriaDot } from "./EventChip";
import { cuentaJuntoAFecha, kindIcon, tipoPill } from "./eventos";

function TemasDelEvento({ evento }: { evento: EventoResumen }) {
  const [temas, setTemas] = useState<string[] | null>(evento.temasCount > 0 ? null : []);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (evento.temasCount === 0) return;
    let cancelled = false;
    apiFetch(`/api/examenes/${evento.id}/temas`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as Tema[];
        if (!cancelled) setTemas(payload.map((tema) => tema.name));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [evento.id, evento.temasCount]);

  if (evento.temasCount === 0) return null;

  return (
    <div className="mt-3">
      <p className="t-meta pb-1.5">Temas</p>
      {error ? (
        <p className="text-[13px] text-foreground-muted">
          {evento.temasCount} {evento.temasCount === 1 ? "tema" : "temas"}
        </p>
      ) : temas === null ? (
        <p className="text-[13px] text-foreground-subtle">Cargando temas…</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {temas.map((tema, index) => (
            <Pill key={`${index}-${tema}`} size="sm">
              {tema}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

export function EventoPreviewPopover({
  evento,
  anchor,
  onClose,
}: {
  evento: EventoResumen | null;
  anchor: HTMLElement | null;
  onClose: () => void;
}) {
  const meta = evento
    ? [fechaLarga(evento.date) ?? "Sin fecha", formatHora(evento.hora), cuentaJuntoAFecha(evento.date)].filter(Boolean)
    : [];

  return (
    <Popover
      open={Boolean(evento)}
      onClose={onClose}
      anchor={anchor}
      placement="bottom-start"
      width={320}
      title={evento?.name ?? "Evento"}
    >
      {evento && (
        <div className="p-4">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase leading-4 tracking-[0.06em] text-foreground-subtle">
            <Icon name={kindIcon(evento.kind)} size={12} />
            {tipoPill(evento.kind, evento.type)}
          </p>
          <p className="mt-1.5 font-serif text-[22px] leading-7 text-foreground max-md:hidden">{evento.name}</p>
          <p className="mt-2 flex min-w-0 items-center gap-2 text-[13px] leading-5 text-foreground-muted">
            <MateriaDot materiaId={evento.materiaId} />
            <span className="truncate">{evento.materiaName}</span>
          </p>
          <p className="mt-0.5 text-[13px] leading-5 text-foreground-muted">{meta.join(" · ")}</p>
          <TemasDelEvento key={evento.id} evento={evento} />
          <ButtonLink
            href={rutas.evento(evento.materiaId, evento.id)}
            variant="secondary"
            size="sm"
            iconRight="chevron-right"
            onClick={onClose}
            className="mt-4"
          >
            Abrir en la materia
          </ButtonLink>
        </div>
      )}
    </Popover>
  );
}
