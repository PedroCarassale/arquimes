"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { Button, IconButton, MOBILE_QUERY, SegmentedControl, toast, useMediaQuery } from "@/components/ui";
import { hoyYmd, mesActual, mesGrid, mesTitulo, mesVecino, parseYmd, sumarDias } from "@/lib/fechas";
import { rutas } from "@/lib/routes";
import type { EventoResumen } from "@/lib/types";
import { Agenda } from "./Agenda";
import { AGENDA_DIAS } from "./constants";
import { DayPopover } from "./DayPopover";
import { EventoPreviewPopover } from "./EventoPreviewPopover";
import { agruparPorDia, calendarioHref } from "./eventos";
import { MonthGrid } from "./MonthGrid";
import { QuickCreatePopover } from "./QuickCreatePopover";
import type { CalendarVista, CalendarViewProps } from "./types";
import { WeekStrip } from "./WeekStrip";

type Overlay =
  | { tipo: "crear"; fecha: string; anchor: HTMLElement | "nuevo" | null; seq: number }
  | { tipo: "dia"; fecha: string; anchor: HTMLElement | null; seq: number }
  | { tipo: "preview"; evento: EventoResumen; anchor: HTMLElement | null; seq: number };

const VISTAS: { value: CalendarVista; label: string }[] = [
  { value: "mes", label: "Mes" },
  { value: "agenda", label: "Agenda" },
];

function semanaDe(ymd: string): string[] {
  const offset = (parseYmd(ymd).getDay() + 6) % 7;
  const lunes = sumarDias(ymd, -offset);
  return Array.from({ length: 7 }, (_, index) => sumarDias(lunes, index));
}

export function CalendarView({
  scope,
  mes,
  vista,
  vistaPorDefecto = false,
  eventosMes,
  agenda,
  nuevo,
}: CalendarViewProps) {
  const router = useRouter();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const global = scope.tipo === "global";
  const hoy = hoyYmd();
  const [mesVisible, setMesVisible] = useOptimistic(mes);
  const [pending, startTransition] = useTransition();
  const [vistaMobile, setVistaMobile] = useState<CalendarVista>("agenda");
  const [nuevoBtn, setNuevoBtn] = useState<HTMLButtonElement | null>(null);
  const seq = useRef(1);
  const [overlay, setOverlay] = useState<Overlay | null>(() =>
    nuevo ? { tipo: "crear", fecha: nuevo.fecha ?? hoyYmd(), anchor: "nuevo", seq: 0 } : null
  );

  const [vistaElegida, setVistaElegida] = useOptimistic(vista);
  const vistaActiva: CalendarVista = vistaPorDefecto && isMobile ? vistaMobile : vistaElegida;
  const vistaUrl = vistaPorDefecto ? undefined : vista;
  const tieneNuevo = Boolean(nuevo);

  useEffect(() => {
    if (!tieneNuevo) return;
    router.replace(calendarioHref(scope, { mes, vista: vistaUrl }), { scroll: false });
  }, [tieneNuevo, router, scope, mes, vistaUrl]);

  const porDia = useMemo(() => {
    const vistos = new Set<string>();
    const todos: EventoResumen[] = [];
    for (const evento of [...eventosMes, ...agenda]) {
      if (vistos.has(evento.id)) continue;
      vistos.add(evento.id);
      todos.push(evento);
    }
    todos.sort(
      (a, b) =>
        (a.date ?? "").localeCompare(b.date ?? "") ||
        (a.hora ? 0 : 1) - (b.hora ? 0 : 1) ||
        (a.hora ?? "").localeCompare(b.hora ?? "")
    );
    return agruparPorDia(todos);
  }, [eventosMes, agenda]);

  const grid = useMemo(() => mesGrid(mesVisible), [mesVisible]);
  const semana = useMemo(() => semanaDe(hoy), [hoy]);

  function next(): number {
    seq.current += 1;
    return seq.current;
  }

  function openCrear(fecha: string, anchor: HTMLElement | "nuevo" | null) {
    setOverlay({ tipo: "crear", fecha, anchor, seq: next() });
  }

  function openDia(fecha: string, anchor: HTMLElement | null) {
    setOverlay({ tipo: "dia", fecha, anchor, seq: next() });
  }

  function openPreview(evento: EventoResumen, anchor: HTMLElement | null) {
    setOverlay({ tipo: "preview", evento, anchor, seq: next() });
  }

  function onDayTap(fecha: string, anchor: HTMLElement) {
    if ((porDia.get(fecha) ?? []).length > 0) openDia(fecha, anchor);
    else openCrear(fecha, anchor);
  }

  function irAMes(destino: string) {
    startTransition(() => {
      setMesVisible(destino);
      router.replace(calendarioHref(scope, { mes: destino, vista: vistaUrl }), { scroll: false });
    });
  }

  function cambiarVista(destino: CalendarVista) {
    if (vistaPorDefecto && isMobile && destino === "mes") {
      setVistaMobile("mes");
      return;
    }
    if (isMobile) setVistaMobile(destino);
    startTransition(() => {
      setVistaElegida(destino);
      router.replace(calendarioHref(scope, { mes: mesVisible, vista: destino }), { scroll: false });
    });
  }

  function onCreated(evento: { id: string; materiaId: string; name: string; date: string }) {
    const enGrilla = grid.length > 0 && evento.date >= grid[0].ymd && evento.date <= grid[grid.length - 1].ymd;
    const enAgenda = evento.date >= hoy && evento.date <= sumarDias(hoy, AGENDA_DIAS);
    if ((vistaActiva === "mes" && enGrilla) || enAgenda) return;
    toast({
      message: `Se guardó «${evento.name}»`,
      action: { label: "Abrir", href: rutas.evento(evento.materiaId, evento.id) },
    });
  }

  const vacio = (
    <div className="px-2 py-3">
      <p className="text-sm text-foreground-muted">Nada por delante.</p>
      <button
        type="button"
        onClick={(event) => openCrear(hoy, event.currentTarget)}
        className="mt-1 text-sm text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground"
      >
        Cargá una fecha →
      </button>
    </div>
  );

  const crearAnchor = overlay?.tipo === "crear" ? (overlay.anchor === "nuevo" ? nuevoBtn : overlay.anchor) : null;

  return (
    <div className="@container w-full px-4 pb-12 pt-3 md:px-8 md:pt-4">
      <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2">
        {vistaActiva === "mes" ? (
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="t-section min-w-0 truncate" aria-live="polite">
              {mesTitulo(mesVisible)}
            </h1>
            <div className="flex items-center gap-1">
              <IconButton icon="chevron-left" label="Mes anterior" size={28} onClick={() => irAMes(mesVecino(mesVisible, -1))} />
              <IconButton icon="chevron-right" label="Mes siguiente" size={28} onClick={() => irAMes(mesVecino(mesVisible, 1))} />
              <Button variant="secondary" size="sm" onClick={() => irAMes(mesActual())} className="ml-1">
                Hoy
              </Button>
            </div>
          </div>
        ) : (
          <h1 className="t-section min-w-0 truncate">Próximas fechas</h1>
        )}
        <div className="ml-auto flex items-center gap-2">
          <SegmentedControl value={vistaActiva} options={VISTAS} onChange={cambiarVista} size="sm" ariaLabel="Vista del calendario" />
          <Button
            ref={setNuevoBtn}
            variant="primary"
            size="sm"
            icon="plus"
            aria-label="Nuevo evento"
            onClick={(event) => openCrear(hoy, event.currentTarget)}
          >
            <span className="max-sm:hidden">Nuevo evento</span>
          </Button>
        </div>
      </div>

      {vistaActiva === "mes" ? (
        <div className="mt-3 grid gap-8 @min-[900px]:grid-cols-[minmax(0,1fr)_320px]">
          <div aria-busy={pending || undefined} className="min-w-0">
            <MonthGrid
              mes={mesVisible}
              hoy={hoy}
              porDia={porDia}
              global={global}
              isMobile={isMobile}
              onCreate={openCrear}
              onDay={openDia}
              onPreview={openPreview}
            />
          </div>
          <aside aria-label="Próximas fechas" className="min-w-0 @min-[900px]:pt-[22px]">
            <h2 className="px-2 pb-3 text-sm font-medium text-foreground">Próximas fechas</h2>
            <Agenda eventos={agenda} global={global} onPreview={openPreview} empty={vacio} />
          </aside>
        </div>
      ) : (
        <div className="mt-3 max-w-[720px]">
          <WeekStrip
            dias={semana}
            hoy={hoy}
            porDia={porDia}
            global={global}
            onDay={onDayTap}
            className="mb-5 md:hidden"
          />
          <Agenda eventos={agenda} global={global} onPreview={openPreview} empty={vacio} />
        </div>
      )}

      {overlay?.tipo === "crear" && (
        <QuickCreatePopover
          key={overlay.seq}
          open
          anchor={crearAnchor}
          scope={scope}
          fecha={overlay.fecha}
          onClose={() => setOverlay(null)}
          onCreated={onCreated}
        />
      )}
      {overlay?.tipo === "dia" && (
        <DayPopover
          key={overlay.seq}
          open
          anchor={overlay.anchor}
          fecha={overlay.fecha}
          eventos={porDia.get(overlay.fecha) ?? []}
          global={global}
          onClose={() => setOverlay(null)}
          onNuevo={(fecha) => openCrear(fecha, overlay.anchor)}
          onPreview={(evento) => openPreview(evento, overlay.anchor)}
        />
      )}
      <EventoPreviewPopover
        key={overlay?.tipo === "preview" ? overlay.seq : "preview"}
        evento={overlay?.tipo === "preview" ? overlay.evento : null}
        anchor={overlay?.tipo === "preview" ? overlay.anchor : null}
        onClose={() => setOverlay(null)}
      />
    </div>
  );
}
