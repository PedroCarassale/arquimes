import { autocompletion } from "@codemirror/autocomplete";
import { Crepe, type CrepeConfig } from "@milkdown/crepe";
import type { SlashProviderOptions } from "@milkdown/kit/plugin/slash";

export type EditorFeatureConfigs = NonNullable<CrepeConfig["featureConfigs"]>;
type FloatingMiddleware = NonNullable<SlashProviderOptions["middleware"]>[number];

export const FLOATING_GUTTER = 16;
const MENU_GAP = 8;
const MENU_GROUPS_MAX = 360;
const MENU_GROUPS_MIN = 96;

export function visibleArea(element: Element): { top: number; bottom: number; left: number; right: number } {
  const viewport = window.visualViewport;
  let top = viewport?.offsetTop ?? 0;
  let left = viewport?.offsetLeft ?? 0;
  let bottom = top + (viewport?.height ?? window.innerHeight);
  let right = left + (viewport?.width ?? window.innerWidth);
  for (let el = element.parentElement; el; el = el.parentElement) {
    if (!/(auto|scroll|hidden|clip)/.test(getComputedStyle(el).overflowY)) continue;
    const rect = el.getBoundingClientRect();
    top = Math.max(top, rect.top);
    bottom = Math.min(bottom, rect.bottom);
    left = Math.max(left, rect.left);
    right = Math.min(right, rect.right);
  }
  return { top, bottom, left, right };
}

const slashMenuPlacement: FloatingMiddleware = {
  name: "arqSlashMenuPlacement",
  fn({ x, rects, elements }) {
    const anchor = elements.reference.getBoundingClientRect();
    const dx = anchor.left - rects.reference.x;
    const dy = anchor.top - rects.reference.y;
    const area = visibleArea(elements.floating);
    const groups = elements.floating.querySelector<HTMLElement>(".menu-groups");
    const chrome = groups ? rects.floating.height - groups.offsetHeight : 0;
    const natural = groups ? chrome + Math.min(groups.scrollHeight, MENU_GROUPS_MAX) : rects.floating.height;
    const below = area.bottom - FLOATING_GUTTER - (anchor.bottom + MENU_GAP);
    const above = anchor.top - MENU_GAP - (area.top + FLOATING_GUTTER);
    const down = below >= natural || below >= above;
    const room = Math.max(down ? below : above, chrome + MENU_GROUPS_MIN);
    const height = Math.min(natural, room);
    if (groups) groups.style.maxHeight = `${Math.max(MENU_GROUPS_MIN, height - chrome)}px`;
    const top = down ? anchor.bottom + MENU_GAP : anchor.top - MENU_GAP - height;
    const minLeft = area.left + FLOATING_GUTTER;
    const maxLeft = Math.max(minLeft, area.right - FLOATING_GUTTER - rects.floating.width);
    const left = Math.min(Math.max(x + dx, minLeft), maxLeft);
    return { x: left - dx, y: top - dy };
  },
};

export function defaultPlaceholder(): string {
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return coarse ? "Escribí algo…" : "Escribí algo, o «/» para insertar";
}

export function EDITOR_FEATURE_CONFIGS(placeholder: string): EditorFeatureConfigs {
  return {
    [Crepe.Feature.Placeholder]: { text: placeholder, mode: "block" },
    [Crepe.Feature.BlockEdit]: {
      blockHandle: { getOffset: () => 6 },
      slashMenu: { floatingUIOptions: { placement: "bottom-start", middleware: [slashMenuPlacement] } },
      textGroup: {
        label: "Texto",
        text: { label: "Texto" },
        h1: { label: "Título 1" },
        h2: { label: "Título 2" },
        h3: { label: "Título 3" },
        h4: null,
        h5: null,
        h6: null,
        quote: { label: "Cita" },
        divider: { label: "Divisor" },
      },
      listGroup: {
        label: "Listas",
        bulletList: { label: "Lista" },
        orderedList: { label: "Lista numerada" },
        taskList: { label: "Tareas" },
      },
      advancedGroup: {
        label: "Bloques",
        image: null,
        codeBlock: { label: "Código" },
        table: { label: "Tabla" },
        math: { label: "Fórmula en bloque" },
      },
    },
    [Crepe.Feature.Toolbar]: {
      boldLabel: "Negrita",
      italicLabel: "Cursiva",
      strikethroughLabel: "Tachado",
      codeLabel: "Código",
      latexLabel: "Fórmula",
      linkLabel: "Link",
    },
    [Crepe.Feature.LinkTooltip]: { inputPlaceholder: "Pegá un link…" },
    [Crepe.Feature.CodeMirror]: {
      searchPlaceholder: "Buscar lenguaje",
      copyText: "Copiar",
      noResultText: "Sin resultados",
      previewLabel: "Vista previa",
      previewLoading: "Cargando…",
      previewToggleText: (previewOnly) => (previewOnly ? "Editar" : "Ocultar"),
      previewOnlyByDefault: false,
      extensions: [autocompletion({ activateOnTyping: false, tooltipClass: () => "arq-cm-completions" })],
    },
    [Crepe.Feature.Latex]: { katexOptions: { strict: "ignore" } },
  };
}
