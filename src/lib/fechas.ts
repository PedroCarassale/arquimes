export const ZONA = "America/Argentina/Buenos_Aires";

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const MES = /^(\d{4})-(\d{2})$/;
const DAY_MS = 86_400_000;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const formatters = new Map<string, Intl.DateTimeFormat>();

function zonaFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function partes(ymd: string): { y: number; m: number; d: number } | null {
  const match = YMD.exec(ymd);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

function utcDia(ymd: string): number | null {
  const p = partes(ymd);
  return p ? Date.UTC(p.y, p.m - 1, p.d) : null;
}

function desdeUtc(ms: number): string {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function normalizarYmd(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (partes(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const ms = Date.parse(trimmed);
    return Number.isNaN(ms) ? null : hoyYmd(new Date(ms));
  }
  return null;
}

export function hoyYmd(now: Date = new Date(), timeZone: string = ZONA): string {
  const parts = zonaFormatter(timeZone).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function parseYmd(ymd: string): Date {
  const p = partes(ymd);
  return p ? new Date(p.y, p.m - 1, p.d) : new Date(Number.NaN);
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function sumarDias(ymd: string, n: number): string {
  const base = utcDia(ymd);
  if (base === null) return ymd;
  return desdeUtc(base + Math.trunc(n) * DAY_MS);
}

export function diasHasta(ymd?: string, now: Date = new Date()): number | null {
  const target = ymd ? utcDia(ymd) : null;
  if (target === null) return null;
  const today = utcDia(hoyYmd(now));
  if (today === null) return null;
  return Math.round((target - today) / DAY_MS);
}

function conAnio(ymd: string, now: Date): string {
  const p = partes(ymd);
  if (!p) return "";
  const base = `${p.d} de ${MESES[p.m - 1]}`;
  return hoyYmd(now).slice(0, 4) === String(p.y) ? base : `${base} de ${p.y}`;
}

export function cuentaRegresiva(ymd?: string, now: Date = new Date()): string | null {
  const dias = diasHasta(ymd, now);
  if (dias === null || !ymd) return null;
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias === 2) return "pasado mañana";
  if (dias > 2 && dias <= 14) return `en ${dias} días`;
  if (dias > 14) return `el ${conAnio(ymd, now)}`;
  if (dias === -1) return "ayer";
  return `hace ${-dias} días`;
}

export function fechaLarga(ymd?: string, now: Date = new Date()): string | null {
  const value = normalizarYmd(ymd);
  const ms = value ? utcDia(value) : null;
  if (!value || ms === null) return null;
  return `${DIAS[new Date(ms).getUTCDay()]} ${conAnio(value, now)}`;
}

export function fechaCorta(ymd?: string): string | null {
  const value = normalizarYmd(ymd);
  const p = value ? partes(value) : null;
  if (!p) return null;
  return `${p.d} ${MESES_CORTOS[p.m - 1]}`;
}

function parseMes(mes: string): { y: number; m: number } | null {
  const match = MES.exec(mes);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  return m >= 1 && m <= 12 ? { y, m } : null;
}

export function mesTitulo(mes: string): string {
  const p = parseMes(mes);
  if (!p) return "";
  const nombre = MESES[p.m - 1];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${p.y}`;
}

export function mesActual(now: Date = new Date()): string {
  return hoyYmd(now).slice(0, 7);
}

export function mesVecino(mes: string, delta: number): string {
  const p = parseMes(mes);
  if (!p) return mes;
  const date = new Date(Date.UTC(p.y, p.m - 1 + Math.trunc(delta), 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export function mesGrid(mes: string): { ymd: string; enMes: boolean }[] {
  const p = parseMes(mes);
  if (!p) return [];
  const first = Date.UTC(p.y, p.m - 1, 1);
  const last = Date.UTC(p.y, p.m, 0);
  const offsetInicio = (new Date(first).getUTCDay() + 6) % 7;
  const offsetFin = 6 - ((new Date(last).getUTCDay() + 6) % 7);
  const start = first - offsetInicio * DAY_MS;
  let total = Math.round((last - first) / DAY_MS) + 1 + offsetInicio + offsetFin;
  if (total < 35) total = 35;
  const prefix = `${p.y}-${pad(p.m)}-`;
  return Array.from({ length: total }, (_, index) => {
    const ymd = desdeUtc(start + index * DAY_MS);
    return { ymd, enMes: ymd.startsWith(prefix) };
  });
}

export function grupoAgenda(
  ymd: string | undefined,
  now: Date = new Date()
): "Hoy" | "Mañana" | "Esta semana" | "La que viene" | string {
  const target = ymd ? utcDia(ymd) : null;
  if (!ymd || target === null) return "Sin fecha";
  const hoy = hoyYmd(now);
  const dias = diasHasta(ymd, now);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias !== null && dias > 1) {
    const today = utcDia(hoy) as number;
    const lunes = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY_MS;
    const proximoLunes = lunes + 7 * DAY_MS;
    if (target < proximoLunes) return "Esta semana";
    if (target < proximoLunes + 7 * DAY_MS) return "La que viene";
  }
  const p = partes(ymd) as { y: number; m: number; d: number };
  const nombre = MESES[p.m - 1];
  const titulo = `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}`;
  return hoy.slice(0, 4) === String(p.y) ? titulo : `${titulo} ${p.y}`;
}

export function formatHora(hora?: string): string | null {
  const match = hora?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}
