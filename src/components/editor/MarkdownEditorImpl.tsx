"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Crepe } from "@milkdown/crepe";
import { codeBlockConfig } from "@milkdown/kit/component/code-block";
import { editorViewCtx, remarkStringifyOptionsCtx } from "@milkdown/kit/core";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import "./markdown-editor.css";
import { normalizeEditorMarkdown } from "@/lib/editor-markdown";
import { EDITOR_FEATURE_CONFIGS, defaultPlaceholder } from "./editor-config";

export type MarkdownEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  className?: string;
  onAskSelection?: (text: string) => void;
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

export function MarkdownEditorImpl({
  value,
  onChange,
  placeholder,
  autoFocus = false,
  readOnly = false,
  className,
  onAskSelection,
}: MarkdownEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const emittedRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const onAskRef = useRef(onAskSelection);
  const init = useRef({ value, placeholder, autoFocus, readOnly, canAsk: Boolean(onAskSelection) });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
    onAskRef.current = onAskSelection;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const host = document.createElement("div");
    root.appendChild(host);
    let disposed = false;
    const { value, placeholder, autoFocus, readOnly, canAsk } = init.current;
    const featureConfigs = EDITOR_FEATURE_CONFIGS(placeholder ?? defaultPlaceholder());
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
        [Crepe.Feature.ImageBlock]: false,
        [Crepe.Feature.TopBar]: false,
        [Crepe.Feature.AI]: false,
      },
      featureConfigs,
    });
    crepe.editor
      .config((ctx) => ctx.update(remarkStringifyOptionsCtx, (prev) => ({ ...prev, bullet: "-" as const, rule: "-" as const })))
      .use(katexPaste)
      .use(mathBlockOnEnter);
    crepe.on((listener) =>
      listener.markdownUpdated((_ctx, markdown) => {
        if (disposed || markdown === emittedRef.current) return;
        emittedRef.current = markdown;
        onChangeRef.current(markdown);
      })
    );
    const ready = crepe.create().then(
      () => {
        if (disposed) return;
        crepe.setReadonly(readOnly);
        emittedRef.current = crepe.getMarkdown();
        crepe.editor.action((ctx) => {
          ctx.get(codeBlockConfig.key).previewOnlyByDefault = false;
        });
        crepeRef.current = crepe;
        if (autoFocus && !readOnly) crepe.editor.action((ctx) => ctx.get(editorViewCtx).focus());
      },
      (error: unknown) => {
        console.error(error);
        if (!disposed) setFailed(true);
      }
    );
    return () => {
      disposed = true;
      crepeRef.current = null;
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
      const markdown = crepe.getMarkdown();
      if (markdown === emittedRef.current) return;
      emittedRef.current = markdown;
      onChangeRef.current(markdown);
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") flushPending();
    }
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pagehide", flushPending, true);
    window.addEventListener("beforeunload", flushPending, true);
    return () => {
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
