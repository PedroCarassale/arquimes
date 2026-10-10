"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Crepe } from "@milkdown/crepe";
import { EditorStateReady, editorViewCtx, editorViewTimerCtx, nodeViewCtx, remarkStringifyOptionsCtx } from "@milkdown/kit/core";
import { createTimer, type MilkdownPlugin } from "@milkdown/kit/ctx";
import { remarkPreserveEmptyLinePlugin } from "@milkdown/kit/preset/commonmark";
import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey, type Selection } from "@milkdown/kit/prose/state";
import type { NodeViewConstructor } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import "./markdown-editor.css";
import { normalizeEditorMarkdown } from "@/lib/editor-markdown";
import { EDITOR_FEATURE_CONFIGS, FLOATING_GUTTER, defaultPlaceholder, visibleArea } from "./editor-config";
import { chatEditsPlugin, createEditorHandle, type EditorHandle } from "./editor-edits";
import { IMAGES_CHANGED, configureImageUploads, imageBlockConfig, imageUploads } from "./image-uploads";
import { withoutPendingImages } from "@/lib/editor-images";
import { greekSymbols } from "./greek-symbols";
import { apunteReferences, type ApunteReferencesOptions } from "./apunte-references";

export type MarkdownEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  className?: string;
  onAskSelection?: (text: string) => void;
  onReady?: (handle: EditorHandle) => (() => void) | void;
  apuntes?: ApunteReferencesOptions;
};

const ASK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-8l-4.5 3.5V17H5A1.5 1.5 0 0 1 3.5 15.5V7A1.5 1.5 0 0 1 5 5.5Z"/><path d="M8.5 10h7M8.5 13h4.5"/></svg>';

function katexSource(element: Element): string {
  return element.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim() ?? "";
}

function pastedKatexToMath(html: string): string {
  if (!html.includes("katex")) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const display of Array.from(doc.querySelectorAll(".katex-display"))) {
    const tex = katexSource(display);
    if (!tex) continue;
    const pre = doc.createElement("pre");
    pre.dataset.language = "LaTeX";
    const code = doc.createElement("code");
    code.textContent = tex;
    pre.appendChild(code);
    display.replaceWith(pre);
  }
  for (const inline of Array.from(doc.querySelectorAll(".katex"))) {
    const tex = katexSource(inline);
    if (!tex) continue;
    const span = doc.createElement("span");
    span.dataset.type = "math_inline";
    span.dataset.value = tex;
    inline.replaceWith(span);
  }
  return doc.body.innerHTML;
}

const katexPaste = $prose(
  () =>
    new Plugin({
      key: new PluginKey("ARQ_KATEX_PASTE"),
      props: { transformPastedHTML: pastedKatexToMath },
    })
);

const mathBlockOnEnter = $prose(
  () =>
    new Plugin({
      key: new PluginKey("ARQ_MATH_BLOCK_ENTER"),
      props: {
        handleDOMEvents: {
          keydown: (view, event) => {
            if (event.key !== "Enter" || event.isComposing) return false;
            if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
            const { state } = view;
            const { $from, empty } = state.selection;
            const codeBlock = state.schema.nodes.code_block;
            if (!empty || !codeBlock || $from.parent.type.name !== "paragraph") return false;
            if ($from.parent.textContent.trim() !== "$$" || $from.parentOffset !== $from.parent.content.size) return false;
            const start = $from.start();
            const before = $from.before();
            const tr = state.tr.delete(start, $from.end()).setBlockType(start, start, codeBlock, { language: "LaTeX" });
            view.dispatch(tr.scrollIntoView());
            event.preventDefault();
            const focusSource = () => {
              const block = view.isDestroyed ? null : view.nodeDOM(before);
              const source = block instanceof HTMLElement ? block.querySelector<HTMLElement>(".cm-content") : null;
              source?.focus();
              return Boolean(source);
            };
            if (!focusSource()) requestAnimationFrame(focusSource);
            return true;
          },
        },
      },
    })
);

type Snapshot = { doc: ProseNode; selection: Selection };

function listItemSelectionGuard(): MilkdownPlugin[] {
  let active: Snapshot | null = null;
  const filter = $prose(
    () =>
      new Plugin({
        key: new PluginKey("ARQ_LIST_ITEM_SELECTION_GUARD"),
        filterTransaction: (tr, state) => {
          if (!active || tr.docChanged || !tr.selectionSet) return true;
          return state.doc === active.doc && state.selection.eq(active.selection);
        },
      })
  );
  const wrap =
    (create: NodeViewConstructor): NodeViewConstructor =>
    (node, view, getPos, decorations, innerDecorations) => {
      let snapshot: Snapshot | null = null;
      requestAnimationFrame(() => {
        active = snapshot;
      });
      const nodeView = create(node, view, getPos, decorations, innerDecorations);
      snapshot = { doc: view.state.doc, selection: view.state.selection };
      requestAnimationFrame(() => {
        if (active === snapshot) active = null;
      });
      return nodeView;
    };
  const timer = createTimer("ArqListItemSelectionGuard");
  const views: MilkdownPlugin = (ctx) => {
    ctx.record(timer);
    ctx.update(editorViewTimerCtx, (timers) => timers.concat(timer));
    return async () => {
      await ctx.wait(EditorStateReady);
      ctx.update(nodeViewCtx, (entries) => entries.map(([id, create]) => [id, id === "list_item" ? wrap(create) : create]));
      ctx.done(timer);
      return () => {
        ctx.update(editorViewTimerCtx, (timers) => timers.filter((t) => t !== timer));
        ctx.clearTimer(timer);
      };
    };
  };
  return [filter, views].flat();
}

function keepInsideGutter(element: HTMLElement) {
  if (element.dataset.show === "false") return;
  const rect = element.getBoundingClientRect();
  if (!rect.width) return;
  const area = visibleArea(element);
  const min = area.left + FLOATING_GUTTER;
  const max = area.right - FLOATING_GUTTER;
  let shift = rect.right > max ? max - rect.right : 0;
  if (rect.left + shift < min) shift = min - rect.left;
  if (Math.abs(shift) < 0.5) return;
  element.style.left = `${(Number.parseFloat(element.style.left) || 0) + shift}px`;
}

function editRenderedMath(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target : null;
  const block = target?.closest<HTMLElement>(".milkdown-code-block");
  if (!block || !target?.closest(".preview-panel") || block.matches(":focus-within")) return;
  const source = block.querySelector<HTMLElement>(".cm-content");
  if (!source) return;
  event.preventDefault();
  source.focus({ preventScroll: true });
  const lastLine = source.lastElementChild;
  if (lastLine) window.getSelection()?.collapse(lastLine, lastLine.childNodes.length);
}

export function MarkdownEditorImpl({
  value,
  onChange,
  placeholder,
  autoFocus = false,
  readOnly = false,
  className,
  onAskSelection,
  onReady,
  apuntes,
}: MarkdownEditorProps) {
  const apuntesRef = useRef(apuntes);
  const conApuntes = useRef(Boolean(apuntes));
  const rootRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const emittedRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const onAskRef = useRef(onAskSelection);
  const onReadyRef = useRef(onReady);
  const init = useRef({ value, placeholder, autoFocus, readOnly, canAsk: Boolean(onAskSelection) });
  const readOnlyRef = useRef(readOnly);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
    onAskRef.current = onAskSelection;
    onReadyRef.current = onReady;
    readOnlyRef.current = readOnly;
    apuntesRef.current = apuntes;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const host = document.createElement("div");
    root.appendChild(host);
    let disposed = false;
    let releaseHandle: (() => void) | null = null;
    const { value, placeholder, autoFocus, readOnly, canAsk } = init.current;
    const featureConfigs = EDITOR_FEATURE_CONFIGS(placeholder ?? defaultPlaceholder());
    featureConfigs[Crepe.Feature.ImageBlock] = imageBlockConfig();
    const referencias = conApuntes.current ? apunteReferences(() => apuntesRef.current) : null;
    if (referencias) {
      featureConfigs[Crepe.Feature.BlockEdit] = { ...featureConfigs[Crepe.Feature.BlockEdit], buildMenu: referencias.buildMenu };
    }
    if (canAsk) {
      featureConfigs[Crepe.Feature.Toolbar] = {
        ...featureConfigs[Crepe.Feature.Toolbar],
        buildToolbar: (builder) => {
          builder.addGroup("chat", "Chat").addItem("ask", {
            icon: ASK_ICON,
            label: "Preguntarle al chat",
            active: () => false,
            onRun: (ctx) => {
              const { state } = ctx.get(editorViewCtx);
              const { from, to } = state.selection;
              const text = state.doc.textBetween(from, to, "\n\n", " ").trim();
              if (text) onAskRef.current?.(text);
            },
          });
        },
      };
    }
    const crepe = new Crepe({
      root: host,
      defaultValue: normalizeEditorMarkdown(value),
      features: {
        [Crepe.Feature.TopBar]: false,
        [Crepe.Feature.AI]: false,
      },
      featureConfigs,
    });
    void crepe.editor.remove(remarkPreserveEmptyLinePlugin);
    crepe.editor
      .config((ctx) => ctx.update(remarkStringifyOptionsCtx, (prev) => ({ ...prev, bullet: "-" as const, rule: "-" as const })))
      .config(configureImageUploads)
      .use(imageUploads)
      .use(katexPaste)
      .use(mathBlockOnEnter)
      .use(listItemSelectionGuard())
      .use(greekSymbols)
      .use(referencias?.plugins ?? [])
      .use(chatEditsPlugin);
    crepe.on((listener) =>
      listener.markdownUpdated((_ctx, updated) => {
        const markdown = withoutPendingImages(updated);
        if (disposed || markdown === emittedRef.current) return;
        emittedRef.current = markdown;
        onChangeRef.current(markdown);
      })
    );
    const ready = crepe.create().then(
      () => {
        if (disposed) return;
        crepe.setReadonly(readOnly);
        emittedRef.current = withoutPendingImages(crepe.getMarkdown());
        crepeRef.current = crepe;
        releaseHandle = onReadyRef.current?.(createEditorHandle(crepe)) || null;
        const active = document.activeElement;
        const typing = active instanceof HTMLElement && (active.isContentEditable || active.matches("input, textarea, select"));
        if (autoFocus && !readOnly && !typing) crepe.editor.action((ctx) => ctx.get(editorViewCtx).focus());
      },
      (error: unknown) => {
        console.error(error);
        if (!disposed) setFailed(true);
      }
    );
    const floating = new MutationObserver((records) => {
      for (const record of records) {
        if (record.target instanceof HTMLElement && record.target.classList.contains("milkdown-toolbar")) {
          keepInsideGutter(record.target);
        }
      }
    });
    floating.observe(host, { subtree: true, attributes: true, attributeFilter: ["style", "data-show"] });
    const onMouseDown = (event: MouseEvent) => {
      if (!readOnlyRef.current) editRenderedMath(event);
    };
    host.addEventListener("mousedown", onMouseDown);
    return () => {
      disposed = true;
      releaseHandle?.();
      crepeRef.current = null;
      floating.disconnect();
      host.removeEventListener("mousedown", onMouseDown);
      void ready
        .catch(() => undefined)
        .then(() => {
          void crepe.destroy();
          host.remove();
        });
    };
  }, []);

  useLayoutEffect(() => {
    function flushPending() {
      const crepe = crepeRef.current;
      if (!crepe) return;
      const markdown = withoutPendingImages(crepe.getMarkdown());
      if (markdown === emittedRef.current) return;
      emittedRef.current = markdown;
      onChangeRef.current(markdown);
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") flushPending();
    }
    const root = rootRef.current;
    root?.addEventListener(IMAGES_CHANGED, flushPending);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pagehide", flushPending, true);
    window.addEventListener("beforeunload", flushPending, true);
    return () => {
      root?.removeEventListener(IMAGES_CHANGED, flushPending);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pagehide", flushPending, true);
      window.removeEventListener("beforeunload", flushPending, true);
      flushPending();
    };
  }, []);

  useEffect(() => {
    crepeRef.current?.setReadonly(readOnly);
  }, [readOnly]);

  const classes = ["arq-editor", className].filter(Boolean).join(" ");
  if (failed) {
    return (
      <div className={classes}>
        <textarea
          defaultValue={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? "Escribí algo…"}
          readOnly={readOnly}
          spellCheck
          className="block min-h-[240px] w-full resize-y border-0 bg-transparent p-0 text-base leading-[26px] text-foreground outline-none placeholder:text-foreground-subtle focus-visible:shadow-none md:pl-11"
        />
      </div>
    );
  }
  return <div ref={rootRef} className={classes} />;
}
