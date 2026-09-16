"use client";

import { useLayoutEffect, useRef } from "react";

type CompactChatComposerProps = {
  id: string;
  value: string;
  placeholder: string;
  sending: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
};

export function CompactChatComposer({
  id,
  value,
  placeholder,
  sending,
  onChange,
  onSend,
}: CompactChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !sending;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const height = Math.min(Math.max(textarea.scrollHeight, 28), 112);
    textarea.style.height = `${height}px`;
    textarea.style.overflowY = textarea.scrollHeight > 112 ? "auto" : "hidden";
  }, [value]);

  return (
    <form
      className="flex items-end gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-lg transition-colors focus-within:border-accent"
      aria-busy={sending}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Escribí un mensaje
      </label>
      <textarea
        ref={textareaRef}
        id={id}
        aria-label="Escribí un mensaje"
        rows={1}
        className="min-h-7 max-h-28 min-w-0 flex-1 resize-none bg-transparent px-1 py-[5px] text-[13px] leading-[18px] text-foreground outline-none [overflow-wrap:anywhere] placeholder:text-foreground-subtle"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button
        type="submit"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-background transition-[background-color,transform,opacity] hover:bg-accent/90 enabled:active:scale-95 disabled:opacity-35"
        disabled={!canSend}
        aria-label="Enviar mensaje"
        title="Enviar"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 12.5v-9M4.5 7 8 3.5 11.5 7" />
        </svg>
      </button>
    </form>
  );
}
