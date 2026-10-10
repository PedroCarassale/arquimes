import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCalendarEventos } from "@/components/calendar/calendar-data";
import { CalendarView } from "@/components/calendar/CalendarView";
import { parseCalendarSearch } from "@/components/calendar/eventos";
import { TabMeta } from "@/components/workspace/WorkspaceContext";
import { getMateriaCached } from "@/lib/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarioMateriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const search = parseCalendarSearch(query);
  const [materia, { eventosMes, agenda }] = await Promise.all([getMateriaCached(id), loadCalendarEventos(search.mes, id)]);
  if (!materia) notFound();

  return (
    <>
      <TabMeta title="Calendario" />
      <CalendarView
        scope={{ tipo: "materia", materiaId: materia.id, materiaName: materia.name }}
        mes={search.mes}
        vista={search.vista}
        vistaPorDefecto={search.vistaPorDefecto}
        eventosMes={eventosMes}
        agenda={agenda}
        nuevo={search.nuevo}
      />
    </>
  );
}
