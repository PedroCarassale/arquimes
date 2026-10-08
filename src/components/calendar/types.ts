import type { EventoResumen } from "@/lib/types";

export type CalendarVista = "mes" | "agenda";

export type CalendarScope =
  | { tipo: "materia"; materiaId: string; materiaName: string }
  | { tipo: "global"; materias: { id: string; name: string }[] };

export type CalendarViewProps = {
  scope: CalendarScope;
  mes: string;
  vista: CalendarVista;
  vistaPorDefecto?: boolean;
  eventosMes: EventoResumen[];
  agenda: EventoResumen[];
  nuevo?: { fecha?: string };
};

export type CalendarSearch = {
  mes: string;
  mesExplicito: boolean;
  vista: CalendarVista;
  vistaPorDefecto: boolean;
  nuevo?: { fecha?: string };
};
