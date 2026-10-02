"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatFileSize } from "@/lib/format";

export type ComposerUploadChip = {
  name: string;
  size: number;
  type: string;
  status: "saving" | "saved" | "error";
};

type ComposerUploadFeedback = {
  tone: "success" | "error";
  text: string;
};

type CompactChatComposerProps = {
  id: string;
  value: string;
  placeholder: string;
  sending: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachFiles?: (files: File[]) => void;
  uploadChip?: ComposerUploadChip | null;
  uploadFeedback?: ComposerUploadFeedback | null;
  uploadChipHref?: string | null;
  uploadChipActionLabel?: string;
};

export function CompactChatComposer({
  id,
  value,
  placeholder,
  sending,
  onChange,
  onSend,
  onAttachFiles,
  uploadChip,
  uploadFeedback,
  uploadChipHref,
  uploadChipActionLabel = "Ver",
}: CompactChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const canSend = value.trim().length > 0 && !sending;
  const uploadLabel = useMemo(() => {
    if (!uploadChip) return "";
    if (uploadChip.status === "saving") return "Guardando…";
    if (uploadChip.status === "saved") return "Guardado";
    return "Error";
  }, [uploadChip]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const height = Math.min(Math.max(textarea.scrollHeight, 28), 112);
    textarea.style.height = `${height}px`;
    textarea.style.overflowY = textarea.scrollHeight > 112 ? "auto" : "hidden";
  }, [value]);

  return (
    <div>
      {uploadChip && (
        <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
          <span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide text-foreground-muted">
            {badgeLabel(uploadChip)}
          </span>
          <span className="min-w-0 truncate rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-foreground">
            {uploadChip.name}
          </span>
          <span className="text-[11px] text-foreground-muted">
            {formatFileSize(uploadChip.size)} · {uploadLabel}
          </span>
          {uploadChip.status === "saving" && (
            <span
              className="inline-flex size-3.5 items-center justify-center text-accent"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 16 16"
                className="t-spinner size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M8 2.25a5.75 5.75 0 1 1-5.66 4.75" strokeLinecap="round" />
              </svg>
            </span>
          )}
          {uploadChip.status === "saved" && (
            <span
              className="t-success-check text-emerald-300"
              data-state="in"
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
                <path
                  d="m3.25 8.4 3 3.1 6.5-6.8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
          {uploadChipHref && uploadChip.status === "saved" && (
            <a
              href={uploadChipHref}
              className="text-[11px] text-accent hover:underline"
            >
              {uploadChipActionLabel} →
            </a>
          )}
        </div>
      )}
      {uploadFeedback && (
        <p
          key={uploadFeedback.text}
          role={uploadFeedback.tone === "error" ? "alert" : undefined}
          className={`t-toast is-open mb-1.5 text-xs ${
            uploadFeedback.tone === "error" ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {uploadFeedback.text}
        </p>
      )}
      <form
        className={`flex items-end gap-1.5 rounded-2xl border bg-surface p-1.5 shadow-lg transition-colors ${
          draggingFiles
            ? "border-accent bg-accent-muted/10"
            : "border-border focus-within:border-accent"
        }`}
        aria-busy={sending}
        onDragOver={(event) => {
          if (!onAttachFiles || !event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDraggingFiles(true);
        }}
        onDragLeave={(event) => {
          if (!onAttachFiles) return;
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDraggingFiles(false);
          }
        }}
        onDrop={(event) => {
          if (!onAttachFiles) return;
          event.preventDefault();
          setDraggingFiles(false);
          const files = Array.from(event.dataTransfer.files || []);
          if (files.length > 0) onAttachFiles(files);
        }}
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
          onPaste={(event) => {
            if (!onAttachFiles) return;
            const files = filesFromClipboard(event);
            if (files.length === 0) return;
            event.preventDefault();
            onAttachFiles(files);
          }}
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
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent sm:size-7 text-background transition-[background-color,transform,opacity] hover:bg-accent/90 enabled:active:scale-95 disabled:opacity-35"
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
    </div>
  );
}

function filesFromClipboard(event: React.ClipboardEvent<HTMLTextAreaElement>): File[] {
  if (event.clipboardData.files?.length) {
    return Array.from(event.clipboardData.files);
  }
  const files: File[] = [];
  for (const item of Array.from(event.clipboardData.items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}

function badgeLabel(file: { type: string; name: string }): string {
  const lowerName = file.name.toLowerCase();
  if (file.type.includes("pdf") || lowerName.endsWith(".pdf")) return "PDF";
  if (file.type.startsWith("image/")) return "IMG";
  if (file.type.startsWith("video/")) return "VID";
  return "FILE";
}
