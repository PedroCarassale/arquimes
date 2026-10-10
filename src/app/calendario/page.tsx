import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { loadCalendarEventos } from "@/components/calendar/calendar-data";
import { CalendarView } from "@/components/calendar/CalendarView";
import { parseCalendarSearch } from "@/components/calendar/eventos";
import { ButtonLink, EmptyState } from "@/components/ui";
import { requirePageSession } from "@/lib/auth-session";
import { getMaterias } from "@/lib/db";
import { rutas } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarioGlobalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageSession();
  const search = parseCalendarSearch(await searchParams);
  const [materias, { eventosMes, agenda }] = await Promise.all([getMaterias(), loadCalendarEventos(search.mes)]);

  if (materias.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-[560px] px-4 pt-[12vh] md:px-8">
          <EmptyState
            icon="calendario"
            title="Primero creá una materia."
            description="Cada materia guarda sus fechas de exámenes y entregas, y acá las ves todas juntas."
            action={
              <ButtonLink href={rutas.nuevaMateria} variant="primary" size="lg" icon="plus">
                Crear materia
              </ButtonLink>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <CalendarView
        scope={{ tipo: "global", materias: materias.map((materia) => ({ id: materia.id, name: materia.name })) }}
        mes={search.mes}
        vista={search.vista}
        vistaPorDefecto={search.vistaPorDefecto}
        eventosMes={eventosMes}
        agenda={agenda}
        nuevo={search.nuevo}
      />
    </AppShell>
  );
}
