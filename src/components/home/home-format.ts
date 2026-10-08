import { ZONA, cuentaRegresiva, diasHasta, fechaLarga, formatHora, grupoAgenda } from "@/lib/fechas";
import type { EventoResumen } from "@/lib/types";

const horaFormatter = new Intl.DateTimeFormat("en-US", { timeZone: ZONA, hour: "numeric", hourCycle: "h23" });

export function horaEnZona(now: Date = new Date()): number {
  return Number(horaFormatter.format(now)) % 24;
}

export function saludo(nombre: string | undefined, now: Date = new Date()): string {
  const hora = horaEnZona(now);
  const base = hora < 13 ? "Buen día" : hora <= 20 ? "Buenas tardes" : "Buenas noches";
  const primerNombre = nombre?.trim().split(/\s+/)[0];
  return primerNombre ? `${base}, ${primerNombre}` : base;
}

export function cantidad(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export type GrupoSeVieneGlobal = "Esta semana" | "La que viene" | "Más adelante";

export function grupoSeVieneGlobal(ymd: string | undefined, now: Date = new Date()): GrupoSeVieneGlobal {
  const grupo = grupoAgenda(ymd, now);
  if (grupo === "Hoy" || grupo === "Mañana" || grupo === "Esta semana") return "Esta semana";
  if (grupo === "La que viene") return "La que viene";
  return "Más adelante";
}

export function cuandoEvento(evento: Pick<EventoResumen, "date" | "hora">, now: Date = new Date()): string {
  const cuenta = cuentaRegresiva(evento.date, now) ?? "Sin fecha";
  const hora = formatHora(evento.hora);
  return hora ? `${cuenta} · ${hora}` : cuenta;
}

export function lineaProximo(evento: Pick<EventoResumen, "name" | "date"> | undefined, now: Date = new Date()): string {
  if (!evento?.date) return "Sin fechas cargadas";
  const dias = diasHasta(evento.date, now);
  if (dias === 0) return `Hoy: ${evento.name}`;
  if (dias === 1) return `Mañana: ${evento.name}`;
  const larga = fechaLarga(evento.date, now);
  const cuenta = cuentaRegresiva(evento.date, now);
  const detalle = dias !== null && dias <= 14 && cuenta ? ` (${cuenta})` : "";
  return larga ? `Próximo: ${evento.name}, ${larga}${detalle}` : `Próximo: ${evento.name}`;
}
