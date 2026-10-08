import { Crepe, type CrepeConfig } from "@milkdown/crepe";

export type EditorFeatureConfigs = NonNullable<CrepeConfig["featureConfigs"]>;

export function defaultPlaceholder(): string {
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return coarse ? "Escribí algo…" : "Escribí algo, o «/» para insertar";
}

export function EDITOR_FEATURE_CONFIGS(placeholder: string): EditorFeatureConfigs {
  return {
    [Crepe.Feature.Placeholder]: { text: placeholder, mode: "block" },
    [Crepe.Feature.BlockEdit]: {
      blockHandle: { getOffset: () => 6 },
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
      previewOnlyByDefault: true,
    },
    [Crepe.Feature.Latex]: { katexOptions: { strict: "ignore" } },
  };
}
