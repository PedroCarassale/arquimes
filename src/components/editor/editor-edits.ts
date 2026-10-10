import type { Crepe } from "@milkdown/crepe";
import { editorViewCtx, parserCtx, serializerCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import { Fragment, type Node as ProseNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import {
  buscarEncabezado,
  finDeSeccion,
  reemplazoPermitido,
  type AvisoEdicion,
  type EdicionClase,
  type EncabezadoDoc,
  type ResultadoEdicion,
} from "@/lib/edicion-clase";
import { normalizeEditorMarkdown } from "@/lib/editor-markdown";
import "./editor-edits.css";

type Rango = { from: number; to: number };
type EditsState = { rangos: Map<string, Rango> };
type EditsMeta = { track?: Rango & { id: string } };

type Seccion = { encabezado: Rango; contenido: Rango };
type Ubicacion = { rango: Rango; exacto: boolean; veces: number };

export type ResultadoDeshacer = "ok" | "editado" | "no-encontrado" | "repetido";

export type EditorHandle = {
  getMarkdown: () => string;
  aplicar: (id: string, edicion: Pick<EdicionClase, "modo" | "donde" | "markdown">) => ResultadoEdicion | null;
  ver: (id: string, markdown: string) => boolean;
  deshacer: (id: string, markdown: string, reemplazado: string | null) => ResultadoDeshacer;
};

const FLASH_MS = 1800;
const editsKey = new PluginKey<EditsState>("ARQ_CHAT_EDITS");
const focusedViews = new WeakSet<EditorView>();

function mapRango(rango: Rango, map: (pos: number, assoc: number) => number): Rango | null {
  const from = map(rango.from, 1);
  const to = map(rango.to, -1);
  return to > from ? { from, to } : null;
}

export const chatEditsPlugin = $prose(
  () =>
    new Plugin<EditsState>({
      key: editsKey,
      state: {
        init: () => ({ rangos: new Map() }),
        apply(tr, prev) {
          const meta = tr.getMeta(editsKey) as EditsMeta | undefined;
          let { rangos } = prev;
          if (tr.docChanged) {
            const map = (pos: number, assoc: number) => tr.mapping.map(pos, assoc);
            rangos = new Map();
            for (const [id, rango] of prev.rangos) {
              const mapped = mapRango(rango, map);
              if (mapped) rangos.set(id, mapped);
            }
          }
          if (meta?.track) rangos = new Map(rangos).set(meta.track.id, { from: meta.track.from, to: meta.track.to });
          return { rangos };
        },
      },
      props: {
        handleDOMEvents: {
          focus: (view) => {
            focusedViews.add(view);
            return false;
          },
        },
      },
    })
);

function isEmptyParagraph(node: ProseNode | null | undefined): boolean {
  return Boolean(node && node.type.name === "paragraph" && node.content.size === 0);
}

function parseFragment(ctx: Ctx, markdown: string): Fragment {
  const doc = ctx.get(parserCtx)(normalizeEditorMarkdown(markdown));
  const nodes: ProseNode[] = [];
  doc.content.forEach((node) => nodes.push(node));
  while (nodes.length && isEmptyParagraph(nodes[nodes.length - 1])) nodes.pop();
  return Fragment.fromArray(nodes);
}

function serializeFragment(ctx: Ctx, fragment: Fragment): string {
  if (fragment.size === 0) return "";
  const { schema } = ctx.get(editorViewCtx).state;
  return ctx.get(serializerCtx)(schema.topNodeType.create(null, fragment)).trim();
}

function coincide(a: Fragment, b: Fragment): boolean {
  if (a.childCount !== b.childCount || a.childCount === 0) return false;
  for (let i = 0; i < a.childCount; i += 1) {
    const x = a.child(i);
    const y = b.child(i);
    if (x.type !== y.type || x.textContent.trim() !== y.textContent.trim()) return false;
  }
  return true;
}

function medida(ctx: Ctx, fragment: Fragment): number {
  return serializeFragment(ctx, fragment).replace(/\s+/g, "").length;
}

function buscar(doc: ProseNode, fragment: Fragment): Rango[] {
  const n = fragment.childCount;
  if (n === 0) return [];
  const starts: number[] = [];
  let pos = 0;
  doc.content.forEach((node) => {
    starts.push(pos);
    pos += node.nodeSize;
  });
  starts.push(pos);
  const found: Rango[] = [];
  for (let i = 0; i + n <= doc.childCount; i += 1) {
    const from = starts[i];
    const to = starts[i + n];
    if (coincide(doc.slice(from, to).content, fragment)) found.push({ from, to });
  }
  return found;
}

function seccion(doc: ProseNode, encabezado: string): Seccion | null {
  const encabezados: (EncabezadoDoc & Rango)[] = [];
  let pos = 0;
  doc.content.forEach((node) => {
    if (node.type.name === "heading") {
      encabezados.push({
        nivel: Number(node.attrs.level) || 1,
        texto: node.textContent,
        from: pos,
        to: pos + node.nodeSize,
      });
    }
    pos += node.nodeSize;
  });
  const index = buscarEncabezado(encabezados, encabezado);
  if (index < 0) return null;
  const heading = encabezados[index];
  const fin = finDeSeccion(encabezados, index);
  return {
    encabezado: { from: heading.from, to: heading.to },
    contenido: { from: heading.to, to: fin >= 0 ? encabezados[fin].from : doc.content.size },
  };
}

function blockElements(view: EditorView, rango: Rango): HTMLElement[] {
  const elements: HTMLElement[] = [];
  view.state.doc.nodesBetween(rango.from, rango.to, (_node, pos) => {
    const dom = view.nodeDOM(pos);
    if (dom instanceof HTMLElement) elements.push(dom);
    return false;
  });
  return elements;
}

function highlight(view: EditorView, rango: Rango): (() => void) | null {
  const container = view.dom.parentElement;
  const elements = blockElements(view, rango);
  if (!container || elements.length === 0) return null;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  elements[0].scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  const overlay = document.createElement("div");
  overlay.className = "arq-chat-edit-flash";
  overlay.setAttribute("aria-hidden", "true");
  const place = () => {
    const rects = elements.filter((element) => element.isConnected).map((element) => element.getBoundingClientRect());
    if (rects.length === 0) return;
    const base = container.getBoundingClientRect();
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    Object.assign(overlay.style, {
      top: `${top - base.top - 6}px`,
      left: `${left - base.left - 8}px`,
      width: `${right - left + 16}px`,
      height: `${bottom - top + 12}px`,
    });
  };
  place();
  container.appendChild(overlay);
  const observer = new ResizeObserver(place);
  for (const element of elements) observer.observe(element);
  return () => {
    observer.disconnect();
    overlay.remove();
  };
}

export function createEditorHandle(crepe: Crepe): EditorHandle {
  let clearFlash: (() => void) | null = null;
  let flashTimer: ReturnType<typeof setTimeout> | null = null;

  function flash(view: EditorView, rango: Rango | null) {
    if (flashTimer) clearTimeout(flashTimer);
    clearFlash?.();
    clearFlash = rango ? highlight(view, rango) : null;
    flashTimer = clearFlash
      ? setTimeout(() => {
          clearFlash?.();
          clearFlash = null;
        }, FLASH_MS)
      : null;
  }

  function locate(ctx: Ctx, id: string, markdown: string): Ubicacion | null {
    const { state } = ctx.get(editorViewCtx);
    const fragment = parseFragment(ctx, markdown);
    const tracked = editsKey.getState(state)?.rangos.get(id);
    if (tracked && coincide(state.doc.slice(tracked.from, tracked.to).content, fragment)) {
      return { rango: tracked, exacto: true, veces: 1 };
    }
    const found = buscar(state.doc, fragment);
    if (found.length) return { rango: found[found.length - 1], exacto: true, veces: found.length };
    return tracked ? { rango: tracked, exacto: false, veces: 0 } : null;
  }

  function run<T>(fallback: T, fn: (ctx: Ctx) => T): T {
    try {
      return crepe.editor.action(fn);
    } catch (error) {
      console.error(error);
      return fallback;
    }
  }

  return {
    getMarkdown: () => crepe.getMarkdown(),
    aplicar: (id, edicion) =>
      run<ResultadoEdicion | null>(null, (ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;
        const { doc } = state;
        const fragment = parseFragment(ctx, edicion.markdown);
        if (fragment.size === 0) return null;
        let from = doc.content.size;
        let to = from;
        let lugar: ResultadoEdicion["lugar"] = "final";
        let aviso: AvisoEdicion | null = null;
        let reemplazado: string | null = null;
        const { donde } = edicion;
        if (donde.tipo === "despues" || donde.tipo === "seccion") {
          const encontrada = seccion(doc, donde.encabezado);
          if (!encontrada) {
            aviso = "sin-encabezado";
          } else if (edicion.modo === "reemplazar") {
            const { contenido, encabezado } = encontrada;
            const actual = doc.slice(contenido.from, contenido.to).content;
            const resto = doc.slice(0, encabezado.from).content.append(doc.slice(contenido.to).content);
            if (reemplazoPermitido({ seccion: medida(ctx, actual), resto: medida(ctx, resto) })) {
              from = contenido.from;
              to = contenido.to;
              lugar = "seccion";
              reemplazado = serializeFragment(ctx, actual);
            } else {
              aviso = "demasiado";
            }
          } else {
            from = to = encontrada.contenido.to;
            lugar = "despues";
          }
        } else if (donde.tipo === "cursor") {
          if (focusedViews.has(view)) {
            const { $head } = state.selection;
            lugar = "cursor";
            if ($head.depth === 0) {
              from = to = $head.pos;
            } else {
              const start = $head.before(1);
              const end = $head.after(1);
              if (isEmptyParagraph(doc.child($head.index(0)))) {
                from = start;
                to = end;
              } else {
                from = to = end;
              }
            }
          } else {
            aviso = "sin-cursor";
          }
        }
        if (lugar === "final" && isEmptyParagraph(doc.lastChild)) from = to - (doc.lastChild?.nodeSize ?? 0);
        const tr = state.tr.replaceWith(from, to, fragment);
        const end = tr.mapping.map(to, 1);
        const rango = { from, to: end };
        view.dispatch(tr.setMeta(editsKey, { track: { id, ...rango } }));
        flash(view, rango);
        return { lugar, aviso, reemplazado };
      }),
    ver: (id, markdown) =>
      run(false, (ctx) => {
        const view = ctx.get(editorViewCtx);
        const found = locate(ctx, id, markdown);
        if (!found) return false;
        flash(view, found.rango);
        return true;
      }),
    deshacer: (id, markdown, reemplazado) =>
      run<ResultadoDeshacer>("no-encontrado", (ctx) => {
        const view = ctx.get(editorViewCtx);
        const found = locate(ctx, id, markdown);
        if (!found) return "no-encontrado";
        if (!found.exacto) return "editado";
        if (found.veces > 1) return "repetido";
        const { from, to } = found.rango;
        const { state } = view;
        let content = reemplazado ? parseFragment(ctx, reemplazado) : Fragment.empty;
        if (content.size === 0 && from === 0 && to === state.doc.content.size) {
          content = Fragment.from(state.schema.nodes.paragraph.create());
        }
        const tr = state.tr.replaceWith(from, to, content);
        const restored = content.size > 0 ? { from, to: tr.mapping.map(to, 1) } : null;
        view.dispatch(tr);
        flash(view, restored);
        return "ok";
      }),
  };
}
