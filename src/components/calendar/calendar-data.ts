import { listEventos } from "@/lib/db";
import { hoyYmd, mesGrid, sumarDias } from "@/lib/fechas";
import type { EventoResumen } from "@/lib/types";
import { AGENDA_DIAS } from "./constants";

export async function loadCalendarEventos(
  mes: string,
  materiaId?: string
): Promise<{ eventosMes: EventoResumen[]; agenda: EventoResumen[] }> {
  const grid = mesGrid(mes);
  const hoy = hoyYmd();
  const [eventosMes, agenda] = await Promise.all([
    grid.length
      ? listEventos({ materiaId, desde: grid[0].ymd, hasta: grid[grid.length - 1].ymd })
      : Promise.resolve([]),
    listEventos({ materiaId, desde: hoy, hasta: sumarDias(hoy, AGENDA_DIAS), incluirSinFecha: true }),
  ]);
  return { eventosMes, agenda };
}
