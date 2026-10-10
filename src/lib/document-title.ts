export const APP_TITLE = "Arquímedes";

const SEPARADOR_MATERIA = " · ";
const SEPARADOR_APP = " — ";

function limpio(value?: string | null): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function documentTitle(item?: string | null, materia?: string | null): string {
  const lugar = [limpio(item), limpio(materia)].filter(Boolean).join(SEPARADOR_MATERIA);
  return lugar ? `${lugar}${SEPARADOR_APP}${APP_TITLE}` : APP_TITLE;
}

export function materiaTitleTemplate(materia: string): string {
  const nombre = limpio(materia);
  return nombre ? `%s${SEPARADOR_MATERIA}${nombre}${SEPARADOR_APP}${APP_TITLE}` : `%s${SEPARADOR_APP}${APP_TITLE}`;
}

export const ROOT_TITLE_TEMPLATE = `%s${SEPARADOR_APP}${APP_TITLE}`;
