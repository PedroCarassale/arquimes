import { createRoot } from "react-dom/client";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import type { MilkdownPlugin } from "@milkdown/kit/ctx";
import type { CrepeFeature } from "@milkdown/crepe";
import { clearTextInCurrentBlockCommand } from "@milkdown/kit/preset/commonmark";
import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { apiFetch } from "@/lib/api";
import { filtrarReferencias, referenciaDe, type ApunteReferencia } from "@/lib/apunte-referencias";
import { LEAF_TEXT, insideOpenSpan } from "@/lib/greek-symbols";
import { tabKindFromPath } from "@/lib/tabs";
import type { ApunteItem } from "@/lib/types";
import { ApuntePicker, type PickerSnapshot } from "./ApuntePicker";
import type { EditorFeatureConfigs } from "./editor-config";
import "./apunte-references.css";

export type ApunteReferencesOptions = {
  materiaId: string;
  onOpen: (href: string, opts: { background: boolean; title?: string }) => void;
};

type BuildMenu = NonNullable<NonNullable<EditorFeatureConfigs[CrepeFeature.BlockEdit]>["buildMenu"]>;
type Mention = { from: number; query: string } | null;
type Meta = { open: number } | "close";

const MAX_QUERY = 60;
const OPENERS = /[\s([{¿¡"'«“‘]$/;

const REFERENCE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>';

const mentionKey = new PluginKey<Mention>("ARQ_APUNTE_MENTION");

function createStore() {
  let snapshot: PickerSnapshot = { open: false, query: "", anchor: null, status: "idle", results: [], total: 0, active: 0 };
  let all: ApunteReferencia[] = [];
  const listeners = new Set<() => void>();
  const set = (patch: Partial<PickerSnapshot>) => {
    const next = { ...snapshot, ...patch };
    const results = filtrarReferencias(all, next.query);
    snapshot = { ...next, results, total: all.length, active: Math.min(next.active, Math.max(0, results.length - 1)) };
    listeners.forEach((listener) => listener());
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: () => snapshot,
    set,
    load(referencias: ApunteReferencia[]) {
      all = referencias;
      set({ status: "ready" });
    },
  };
}

function canStartMention(view: EditorView, from: number): boolean {
  const $from = view.state.doc.resolve(from);
  if (!$from.parent.isTextblock || $from.parent.type.spec.code) return false;
  if ($from.marks().some((mark) => mark.type.spec.code)) return false;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, LEAF_TEXT);
  if (before && !OPENERS.test(before) && !before.endsWith(LEAF_TEXT)) return false;
  return !insideOpenSpan(before);
}

function insertReference(view: EditorView, referencia: ApunteReferencia) {
  const mention = mentionKey.getState(view.state);
  const link = view.state.schema.marks.link;
  if (!mention || !link) return;
  const { state } = view;
  const end = state.selection.from;
  const marks = state.doc.resolve(mention.from).marks().filter((mark) => !mark.type.spec.code && mark.type !== link);
  const text = state.schema.text(referencia.nombre, [...marks, link.create({ href: referencia.href })]);
  const tr = state.tr.replaceWith(mention.from, end, text);
  const after = mention.from + referencia.nombre.length;
  const next = tr.doc.resolve(after).nodeAfter?.text?.charAt(0);
  if (!next || !/\s/.test(next)) tr.insert(after, state.schema.text(" ", marks));
  tr.setSelection(TextSelection.create(tr.doc, after + 1)).setStoredMarks(marks).setMeta(mentionKey, "close");
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

function handleMentionKey(view: EditorView, event: KeyboardEvent, store: ReturnType<typeof createStore>): boolean {
  if (!mentionKey.getState(view.state) || event.isComposing) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const { results, active } = store.get();
  if (event.key === "Escape") {
    closeMention(view);
    return true;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (!results.length) return false;
    const step = event.key === "ArrowDown" ? 1 : -1;
    store.set({ active: (active + step + results.length) % results.length });
    return true;
  }
  if (event.key !== "Enter" && event.key !== "Tab") return false;
  const choice = results[active];
  if (!choice) {
    closeMention(view);
    return false;
  }
  insertReference(view, choice);
  return true;
}

function closeMention(view: EditorView) {
  if (mentionKey.getState(view.state)) view.dispatch(view.state.tr.setMeta(mentionKey, "close" satisfies Meta));
}

export function apunteReferences(getOptions: () => ApunteReferencesOptions | undefined): {
  plugins: MilkdownPlugin[];
  buildMenu: BuildMenu;
} {
  const store = createStore();

  let pressed: { x: number; y: number; anchor: Element } | null = null;

  function internalHref(anchor: Element | null): string | null {
    const options = getOptions();
    const href = anchor?.getAttribute("href");
    return options && href && tabKindFromPath(options.materiaId, href) !== null ? href : null;
  }

  function openLink(event: MouseEvent, anchor: Element | null): boolean {
    const options = getOptions();
    const href = internalHref(anchor);
    if (!options || !href || event.shiftKey || event.altKey) return false;
    event.preventDefault();
    options.onOpen(href, {
      background: event.ctrlKey || event.metaKey || event.button === 1,
      title: anchor?.textContent?.trim() || undefined,
    });
    return true;
  }

  function linkIn(view: EditorView, event: MouseEvent): Element | null {
    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest("a[href]") ?? null;
    return anchor && view.dom.contains(anchor) ? anchor : null;
  }

  let loading: Promise<void> | null = null;
  function load() {
    const options = getOptions();
    if (!options || loading) return;
    if (store.get().status !== "ready") store.set({ status: "loading" });
    loading = apiFetch(`/api/materias/${options.materiaId}/apuntes`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const items = (await response.json()) as ApunteItem[];
        store.load(items.map((item) => referenciaDe(options.materiaId, item)));
      })
      .catch(() => {
        if (store.get().status !== "ready") store.set({ status: "error" });
      })
      .finally(() => {
        loading = null;
      });
  }

  const plugin = $prose(
    () =>
      new Plugin<Mention>({
        key: mentionKey,
        state: {
          init: () => null,
          apply(tr, value, _old, state) {
            const meta = tr.getMeta(mentionKey) as Meta | undefined;
            if (meta === "close") return null;
            const from = meta ? meta.open : value ? tr.mapping.map(value.from) : null;
            if (from === null) return null;
            const { selection, doc } = state;
            if (!selection.empty || selection.from <= from || from >= doc.content.size) return null;
            if (!doc.resolve(from).sameParent(selection.$from)) return null;
            const text = doc.textBetween(from, selection.from, "\n", LEAF_TEXT);
            const query = text.slice(1);
            if (!text.startsWith("@") || query.length > MAX_QUERY || /^\s|\n/.test(query) || query.includes(LEAF_TEXT)) {
              return null;
            }
            return { from, query };
          },
        },
        props: {
          handleTextInput(view, from, to, text) {
            if (text !== "@" || view.composing || !getOptions()) return false;
            if (mentionKey.getState(view.state) || !canStartMention(view, from)) return false;
            view.dispatch(view.state.tr.insertText("@", from, to).setMeta(mentionKey, { open: from } satisfies Meta));
            return true;
          },
          handleDOMEvents: {
            keydown: (view, event) => {
              const handled = handleMentionKey(view, event, store);
              if (handled) event.preventDefault();
              return handled;
            },
            mousedown: (view, event) => {
              const anchor = linkIn(view, event);
              pressed = internalHref(anchor) && anchor ? { x: event.clientX, y: event.clientY, anchor } : null;
              if (!pressed || !(event.ctrlKey || event.metaKey || event.button === 1)) return false;
              event.preventDefault();
              return true;
            },
            click: (view, event) => {
              const anchor = linkIn(view, event);
              const start = pressed;
              pressed = null;
              if (!anchor || start?.anchor !== anchor) return false;
              if (Math.abs(event.clientX - start.x) > 4 || Math.abs(event.clientY - start.y) > 4) return false;
              return openLink(event, anchor);
            },
            auxclick: (view, event) => event.button === 1 && openLink(event, linkIn(view, event)),
          },
        },
        view(editorView) {
          let current = editorView;
          const container = document.createElement("div");
          document.body.appendChild(container);
          const root = createRoot(container);
          root.render(
            <ApuntePicker
              store={store}
              onPick={(referencia) => insertReference(current, referencia)}
              onHover={(index) => store.set({ active: index })}
            />
          );
          let frame = 0;
          let wasOpen = false;
          const sync = () => {
            const mention = mentionKey.getState(current.state);
            if (!mention) {
              wasOpen = false;
              if (store.get().open) store.set({ open: false, anchor: null, query: "", active: 0 });
              return;
            }
            if (!wasOpen) load();
            const coords = current.coordsAtPos(mention.from);
            store.set({
              open: true,
              query: mention.query,
              anchor: { left: coords.left, top: coords.top, bottom: coords.bottom },
              active: wasOpen ? store.get().active : 0,
            });
            wasOpen = true;
            const { status, results } = store.get();
            if (status === "ready" && !results.length && /\s$/.test(mention.query)) {
              setTimeout(() => closeMention(current), 0);
            }
          };
          const onScroll = () => {
            if (!store.get().open) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(sync);
          };
          const onBlur = () => {
            setTimeout(() => {
              if (!current.isDestroyed && !current.hasFocus()) closeMention(current);
            }, 0);
          };
          const onPreviewClick = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            const anchor = target?.closest(".milkdown-link-preview a.link-display") ?? null;
            if (anchor && current.dom.parentElement?.contains(anchor)) openLink(event, anchor);
          };
          window.addEventListener("scroll", onScroll, true);
          window.addEventListener("resize", onScroll);
          editorView.dom.addEventListener("blur", onBlur);
          document.addEventListener("click", onPreviewClick, true);
          return {
            update(view) {
              current = view;
              sync();
            },
            destroy() {
              cancelAnimationFrame(frame);
              window.removeEventListener("scroll", onScroll, true);
              window.removeEventListener("resize", onScroll);
              editorView.dom.removeEventListener("blur", onBlur);
              document.removeEventListener("click", onPreviewClick, true);
              setTimeout(() => {
                root.unmount();
                container.remove();
              }, 0);
            },
          };
        },
      })
  );

  const buildMenu: BuildMenu = (builder) => {
    builder.getGroup("advanced").addItem("apunte", {
      label: "Referencia a apunte",
      icon: REFERENCE_ICON,
      onRun: (ctx) => {
        ctx.get(commandsCtx).call(clearTextInCurrentBlockCommand.key);
        const view = ctx.get(editorViewCtx);
        const { from, to } = view.state.selection;
        view.dispatch(view.state.tr.insertText("@", from, to).setMeta(mentionKey, { open: from } satisfies Meta));
        view.focus();
      },
    });
  };

  return { plugins: [plugin].flat(), buildMenu };
}
