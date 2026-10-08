import type { IconName } from "@/components/ui";
import { evaluacionTipoLabel } from "@/lib/evaluaciones";
import { cuentaRegresiva, diasHasta, mesActual, parseYmd } from "@/lib/fechas";
import { rutas } from "@/lib/routes";
import type { EvaluacionKind, EventoResumen, ExamType } from "@/lib/types";
import type { CalendarScope, CalendarSearch, CalendarVista } from "./types";

export const KIND_OPTIONS: { value: EvaluacionKind; label: string; placeholder: string }[] = [
  { value: "examen", label: "Examen", placeholder: "Primer parcial" },
  { value: "entrega", label: "Entrega", placeholder: "TP 2" },
  { value: "evento", label: "Otro", placeholder: "Consulta" },
];

export const TYPE_OPTIONS: { value: ExamType; label: string }[] = [
  { value: "parcial", label: "Parcial" },
  { value: "recuperatorio", label: "Recuperatorio" },
  { value: "final", label: "Final" },
];

export const DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function kindIcon(kind?: EvaluacionKind): IconName {
  return kind ?? "examen";
}

export function cuentaJuntoAFecha(ymd?: string): string | null {
  const dias = diasHasta(ymd);
  if (dias === null || Math.abs(dias) > 14) return null;
  return cuentaRegresiva(ymd);
}

export function kindPlaceholder(kind: EvaluacionKind): string {
  return KIND_OPTIONS.find((option) => option.value === kind)?.placeholder ?? "";
}

export function tipoCorto(evento: { kind?: EvaluacionKind; type?: ExamType }): string {
  return evaluacionTipoLabel({ kind: evento.kind ?? "examen", type: evento.type });
}

export function tipoPill(kind: EvaluacionKind | undefined, type: ExamType | undefined): string {
  if (kind === "entrega") return "Entrega";
  if (kind === "evento") return "Otro";
  const sub = TYPE_OPTIONS.find((option) => option.value === type)?.label;
  return sub ? `Examen · ${sub}` : "Examen";
}

export function normalizeHora(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  let h: number;
  let m: number;
  const conSeparador = value.match(/^(\d{1,2})\s*[:.h]\s*(\d{2})?$/i);
  const soloDigitos = value.match(/^(\d{1,4})$/);
  if (conSeparador) {
    h = Number(conSeparador[1]);
    m = conSeparador[2] ? Number(conSeparador[2]) : 0;
  } else if (soloDigitos) {
    const digits = soloDigitos[1];
    if (digits.length <= 2) {
      h = Number(digits);
      m = 0;
    } else {
      h = Number(digits.slice(0, digits.length - 2));
      m = Number(digits.slice(-2));
    }
  } else {
    return null;
  }
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isYmd(value: string | undefined): value is string {
  return Boolean(value && YMD.test(value) && !Number.isNaN(parseYmd(value).getTime()));
}

export function agruparPorDia(eventos: EventoResumen[]): Map<string, EventoResumen[]> {
  const map = new Map<string, EventoResumen[]>();
  for (const evento of eventos) {
    if (!evento.date) continue;
    const list = map.get(evento.date);
    if (list) list.push(evento);
    else map.set(evento.date, [evento]);
  }
  return map;
}

export function calendarioHref(
  scope: CalendarScope,
  opts: { mes?: string; vista?: CalendarVista; nuevo?: boolean; fecha?: string }
): string {
  const mes = opts.mes && opts.mes !== mesActual() ? opts.mes : undefined;
  const vista = opts.vista === "agenda" ? ("agenda" as const) : undefined;
  if (scope.tipo === "materia") {
    return rutas.calendario(scope.materiaId, { mes, vista, nuevo: opts.nuevo, fecha: opts.fecha });
  }
  const params = new URLSearchParams();
  if (mes) params.set("mes", mes);
  if (vista) params.set("vista", vista);
  if (opts.nuevo) params.set("nuevo", "1");
  if (opts.fecha) params.set("fecha", opts.fecha);
  const query = params.toString();
  return query ? `${rutas.calendarioGlobal}?${query}` : rutas.calendarioGlobal;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCalendarSearch(params: Record<string, string | string[] | undefined>): CalendarSearch {
  const mesParam = first(params.mes);
  const vistaParam = first(params.vista);
  const fechaParam = first(params.fecha);
  const nuevoParam = first(params.nuevo);
  const fecha = isYmd(fechaParam) ? fechaParam : undefined;
  const mesExplicito = Boolean(mesParam && MES.test(mesParam));
  const mes = mesExplicito ? (mesParam as string) : fecha ? fecha.slice(0, 7) : mesActual();
  const nuevo = nuevoParam === "1" ? { fecha } : undefined;
  return {
    mes,
    mesExplicito,
    vista: vistaParam === "agenda" ? "agenda" : "mes",
    vistaPorDefecto: vistaParam !== "agenda" && vistaParam !== "mes",
    nuevo,
  };
}
