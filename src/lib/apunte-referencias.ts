import { rutas } from "./routes.ts";
import type { ApunteItem } from "./types.ts";

export type ApunteReferencia = { key: string; nombre: string; href: string; item: ApunteItem };

export function referenciaDe(materiaId: string, item: ApunteItem): ApunteReferencia {
  const archivo = item.origen === "archivo";
  return {
    key: `${item.origen}:${item.id}`,
    nombre: archivo ? item.name : item.titulo,
    href: archivo ? rutas.archivo(materiaId, item.id) : rutas.generado(materiaId, item.id),
    item,
  };
}

function plano(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function filtrarReferencias(referencias: ApunteReferencia[], consulta: string): ApunteReferencia[] {
  const buscado = plano(consulta);
  if (!buscado) return referencias;
  const alInicio: ApunteReferencia[] = [];
  const adentro: ApunteReferencia[] = [];
  for (const referencia of referencias) {
    const nombre = plano(referencia.nombre);
    if (nombre.startsWith(buscado)) alInicio.push(referencia);
    else if (nombre.includes(buscado)) adentro.push(referencia);
  }
  return [...alInicio, ...adentro];
}
