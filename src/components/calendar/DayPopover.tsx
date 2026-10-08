"use client";

import { Button, Popover } from "@/components/ui";
import { fechaLarga } from "@/lib/fechas";
import type { EventoResumen } from "@/lib/types";
import { AgendaRow } from "./Agenda";

export function DayPopover({
  open,
  anchor,
  fecha,
  eventos,
  global,
  onClose,
  onNuevo,
  onPreview,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  fecha: string;
  eventos: EventoResumen[];
  global: boolean;
  onClose: () => void;
  onNuevo: (fecha: string) => void;
  onPreview: (evento: EventoResumen, anchor: HTMLElement) => void;
}) {
  const titulo = fechaLarga(fecha) ?? fecha;
  return (
    <Popover open={open} onClose={onClose} anchor={anchor} placement="bottom-start" width={320} title={titulo}>
      <div className="p-1.5">
        <p className="t-meta px-2 pb-1 pt-1 max-md:hidden">{titulo}</p>
        <ul>
          {eventos.map((evento) => (
            <li key={evento.id}>
              <AgendaRow evento={evento} global={global} onPreview={onPreview} onNavigate={onClose} />
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-border-subtle px-0.5 pt-1.5">
          <Button variant="ghost" size="sm" icon="plus" onClick={() => onNuevo(fecha)} className="w-full justify-start">
            Nuevo evento
          </Button>
        </div>
      </div>
    </Popover>
  );
}
