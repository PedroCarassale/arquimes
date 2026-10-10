export type EdicionModo = "agregar" | "reemplazar";

export type EdicionDonde =
  | { tipo: "final" }
  | { tipo: "cursor" }
  | { tipo: "despues"; encabezado: string }
  | { tipo: "seccion"; encabezado: string };

export type LugarEdicion = "final" | "cursor" | "despues" | "seccion";

export type AvisoEdicion = "sin-encabezado" | "sin-cursor" | "demasiado";

export type ResultadoEdicion = {
  lugar: LugarEdicion;
  aviso: AvisoEdicion | null;
  reemplazado: string | null;
};

export type RegistroEdicion = ResultadoEdicion & { estado: "aplicada" | "deshecha" };

export type EdicionClase = {
  modo: EdicionModo;
  donde: EdicionDonde;
  markdown: string;
  notaId?: string;
  titulo?: string;
  registro?: RegistroEdicion;
};

export type EncabezadoDoc = { nivel: number; texto: string };

export type ParteEdicion = { kind: "text"; text: string } | { kind: "edicion"; edicion: EdicionClase };

const BLOCK = /<edicion-clase\b([^>]*)>([\s\S]*?)(?:<\/edicion-clase>|$)/gi;
const ATTR = /([\w-]+)\s*=\s*"([^"]*)"/g;
const MAX_EDICIONES = 4;
const MAX_FRACCION_REEMPLAZO = 0.7;
const LUGARES: readonly LugarEdicion[] = ["final", "cursor", "despues", "seccion"];
const AVISOS: readonly AvisoEdicion[] = ["sin-encabezado", "sin-cursor", "demasiado"];

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function decodeAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function encodeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stripFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?[ \t]*\n([\s\S]*?)\n```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

function limpiarEncabezado(value: string): string {
  return value
    .replace(/^\s*#{1,6}\s*/, "")
    .replace(/^[«"“']+|[»"”']+$/g, "")
    .trim();
}

export function normalizarEncabezado(text: string): string {
  return fold(text)
    .replace(/[*_`~#«»"“”]/g, "")
    .replace(/[\s:.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buscarEncabezado(encabezados: readonly EncabezadoDoc[], encabezado: string): number {
  const objetivo = normalizarEncabezado(encabezado);
  if (!objetivo) return -1;
  return encabezados.findIndex((h) => normalizarEncabezado(h.texto) === objetivo);
}

export function finDeSeccion(encabezados: readonly EncabezadoDoc[], index: number): number {
  const nivel = encabezados[index]?.nivel ?? 1;
  for (let i = index + 1; i < encabezados.length; i += 1) {
    if (encabezados[i].nivel <= nivel) return i;
  }
  return -1;
}

export function reemplazoPermitido(medidas: { seccion: number; resto: number }): boolean {
  const { seccion, resto } = medidas;
  if (seccion <= 0) return true;
  if (resto <= 0) return false;
  return seccion <= MAX_FRACCION_REEMPLAZO * (seccion + resto);
}

export function parseDonde(raw: string | undefined, modo: EdicionModo = "agregar"): EdicionDonde {
  const value = (raw ?? "").trim();
  const folded = fold(value);
  const conEncabezado = value.match(/^\s*(despu[eé]s(?:\s+de)?|secci[oó]n|en)\s*:\s*([\s\S]+)$/i);
  if (conEncabezado) {
    const encabezado = limpiarEncabezado(conEncabezado[2]);
    if (encabezado) return modo === "reemplazar" ? { tipo: "seccion", encabezado } : { tipo: "despues", encabezado };
  }
  if (folded === "cursor" || folded === "aca" || folded === "aqui") return { tipo: "cursor" };
  return { tipo: "final" };
}

export function serializeDonde(donde: EdicionDonde): string {
  if (donde.tipo === "despues") return `despues:${donde.encabezado}`;
  if (donde.tipo === "seccion") return `seccion:${donde.encabezado}`;
  return donde.tipo;
}

function registroDesdeAttrs(attrs: Record<string, string>): RegistroEdicion | undefined {
  const { estado } = attrs;
  if (estado !== "aplicada" && estado !== "deshecha") return undefined;
  const lugar = LUGARES.find((item) => item === attrs.lugar) ?? "final";
  const aviso = AVISOS.find((item) => item === attrs.aviso) ?? null;
  const reemplazado = lugar === "seccion" && attrs.previo !== undefined ? attrs.previo : null;
  return { estado, lugar, aviso, reemplazado };
}

function edicionDesdeMatch(attrsRaw: string, body: string): EdicionClase | null {
  const attrs: Record<string, string> = {};
  for (const attr of attrsRaw.matchAll(ATTR)) attrs[attr[1].toLowerCase()] = decodeAttr(attr[2]).trim();
  const markdown = stripFence(body);
  if (!markdown) return null;
  const pideReemplazo = /^(?:reemplazar|reemplazo|reescribir|cambiar)$/i.test(attrs.modo ?? "");
  const donde = parseDonde(attrs.donde, pideReemplazo ? "reemplazar" : "agregar");
  const modo: EdicionModo = pideReemplazo && donde.tipo === "seccion" ? "reemplazar" : "agregar";
  const notaId = attrs.nota || undefined;
  const registro = notaId ? registroDesdeAttrs(attrs) : undefined;
  return {
    modo,
    donde,
    markdown,
    notaId,
    titulo: attrs.titulo || undefined,
    ...(registro ? { registro } : {}),
  };
}

export function serializeEdicion(edicion: EdicionClase): string {
  const { registro } = edicion;
  const attrs = [
    edicion.notaId ? `nota="${encodeAttr(edicion.notaId)}"` : "",
    edicion.titulo ? `titulo="${encodeAttr(edicion.titulo)}"` : "",
    `modo="${edicion.modo}"`,
    `donde="${encodeAttr(serializeDonde(edicion.donde))}"`,
    registro ? `estado="${registro.estado}" lugar="${registro.lugar}"` : "",
    registro?.aviso ? `aviso="${registro.aviso}"` : "",
    registro && registro.lugar === "seccion" && registro.reemplazado !== null
      ? `previo="${encodeAttr(registro.reemplazado)}"`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<edicion-clase ${attrs}>\n${edicion.markdown}\n</edicion-clase>`;
}

function reescribirEdiciones(
  content: string,
  fn: (edicion: EdicionClase, index: number) => EdicionClase | null
): string {
  let index = 0;
  return content.replace(BLOCK, (block, attrsRaw: string, body: string) => {
    const edicion = edicionDesdeMatch(attrsRaw, body);
    if (!edicion?.notaId) return block;
    const next = fn(edicion, index++);
    return next ? serializeEdicion(next) : block;
  });
}

export function parseRegistro(raw: unknown, maxChars = Infinity): RegistroEdicion | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.estado !== "aplicada" && value.estado !== "deshecha") return null;
  const lugar = LUGARES.find((item) => item === value.lugar);
  if (!lugar) return null;
  const aviso = AVISOS.find((item) => item === value.aviso) ?? null;
  const reemplazado = lugar === "seccion" && typeof value.reemplazado === "string" ? value.reemplazado : null;
  if (reemplazado !== null && reemplazado.length > maxChars) return null;
  return { estado: value.estado, lugar, aviso, reemplazado };
}

export function registrarEdicion(content: string, index: number, registro: RegistroEdicion): string | null {
  let found = false;
  const next = reescribirEdiciones(content, (edicion, i) => {
    if (i !== index) return null;
    found = true;
    return { ...edicion, registro };
  });
  return found ? next : null;
}

export function sinRegistros(content: string): string {
  if (!/<edicion-clase\b[^>]*\sestado="/i.test(content)) return content;
  return reescribirEdiciones(content, (edicion) => {
    if (!edicion.registro) return null;
    const limpia = { ...edicion };
    delete limpia.registro;
    return limpia;
  });
}

export function splitEdiciones(content: string): ParteEdicion[] {
  const parts: ParteEdicion[] = [];
  let last = 0;
  for (const match of content.matchAll(BLOCK)) {
    const before = content.slice(last, match.index).trim();
    if (before) parts.push({ kind: "text", text: before });
    last = (match.index ?? 0) + match[0].length;
    const edicion = edicionDesdeMatch(match[1], match[2]);
    if (edicion) parts.push({ kind: "edicion", edicion });
  }
  const rest = content.slice(last).trim();
  if (rest) parts.push({ kind: "text", text: rest });
  return parts;
}

function unir(parts: string[]): string {
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function procesarEdiciones(
  text: string,
  clase: { id: string; titulo: string } | null
): { text: string; ediciones: EdicionClase[] } {
  if (!/<edicion-clase\b/i.test(text)) return { text, ediciones: [] };
  const ediciones: EdicionClase[] = [];
  const pieces = splitEdiciones(text).map((part) => {
    if (part.kind === "text") return part.text;
    if (!clase || ediciones.length >= MAX_EDICIONES) return part.edicion.markdown;
    const edicion = { ...part.edicion, notaId: clase.id, titulo: clase.titulo };
    ediciones.push(edicion);
    return serializeEdicion(edicion);
  });
  return { text: unir(pieces), ediciones };
}

export function sinEdiciones(text: string, mode: "unwrap" | "drop" = "unwrap"): string {
  if (!/<edicion-clase\b/i.test(text)) return text;
  return unir(
    splitEdiciones(text).flatMap((part) =>
      part.kind === "text" ? [part.text] : mode === "unwrap" ? [part.edicion.markdown] : []
    )
  );
}

export function edicionesDeMensaje(content: string): EdicionClase[] {
  return splitEdiciones(content).flatMap((part) =>
    part.kind === "edicion" && part.edicion.notaId ? [part.edicion] : []
  );
}
