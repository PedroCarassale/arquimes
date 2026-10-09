"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Icon, cx, fileIconName } from "@/components/ui";
import { formatFileSize } from "@/lib/format";
import { SUPPORTED_STUDY_EXTENSIONS } from "@/lib/limits";

const STUDY_FILE_ACCEPT = Array.from(SUPPORTED_STUDY_EXTENSIONS, (ext) => `.${ext}`).join(",");

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
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

const STATUS_LABEL: Record<ComposerUploadChip["status"], string> = {
  saving: "Guardando…",
  saved: "Guardado",
  error: "No se pudo guardar",
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
  textareaRef,
}: CompactChatComposerProps) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ref = textareaRef ?? localRef;
  const [draggingFiles, setDraggingFiles] = useState(false);
  const canSend = value.trim().length > 0 && !sending;

  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const height = Math.min(Math.max(textarea.scrollHeight, 28), 160);
    textarea.style.height = `${height}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
  }, [value, ref]);

  return (
    <div>
      {uploadChip && (
        <div className="mb-1.5 flex min-w-0 items-center gap-1.5 px-1 text-xs">
          <span className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-sm bg-surface px-2 text-foreground shadow-[0_0_0_1px_var(--border-subtle)]">
            <Icon name={fileIconName(uploadChip.type, uploadChip.name)} size={12} className="text-foreground-muted" />
            <span className="min-w-0 truncate">{uploadChip.name}</span>
          </span>
          <span
            className={cx(
              "inline-flex shrink-0 items-center gap-1 font-mono text-[11px]",
              uploadChip.status === "error" ? "text-danger" : "text-foreground-subtle"
            )}
          >
            {uploadChip.status === "saving" && (
              <svg viewBox="0 0 16 16" className="t-spinner size-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M8 2.25a5.75 5.75 0 1 1-5.66 4.75" strokeLinecap="round" />
              </svg>
            )}
            {uploadChip.status === "saved" && <Icon name="check" size={12} />}
            {formatFileSize(uploadChip.size)} · {STATUS_LABEL[uploadChip.status]}
          </span>
        </div>
      )}
      {uploadFeedback && (
        <p
          key={uploadFeedback.text}
          role={uploadFeedback.tone === "error" ? "alert" : undefined}
          className={cx(
            "mb-1.5 px-1 text-xs leading-5",
            uploadFeedback.tone === "error" ? "text-danger" : "text-foreground-muted"
          )}
        >
          {uploadFeedback.text}
        </p>
      )}
      <form
        className={cx(
          "flex items-end gap-1 rounded-[14px] p-1.5 shadow-[0_0_0_1px_var(--ring-color),0_1px_2px_rgb(0_0_0/0.2),0_2px_6px_rgb(0_0_0/0.2)] transition-[background-color,box-shadow] duration-(--dur-fast) ease-(--ease-out)",
          draggingFiles
            ? "bg-surface-elevated [--ring-color:var(--border-strong)]"
            : "bg-surface [--ring-color:var(--border)] focus-within:[--ring-color:var(--border-strong)]"
        )}
        aria-busy={sending}
        onDragOver={(event) => {
          if (!onAttachFiles || !event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDraggingFiles(true);
        }}
        onDragLeave={(event) => {
          if (!onAttachFiles) return;
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingFiles(false);
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
        {onAttachFiles && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              accept={STUDY_FILE_ACCEPT}
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                event.target.value = "";
                if (files.length > 0) onAttachFiles(files);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground-muted transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover hover:text-foreground active:bg-pressed pointer-coarse:size-10"
              aria-label="Adjuntar archivo"
              title="Adjuntar archivo"
            >
              <Icon name="plus" size={16} />
            </button>
          </>
        )}
        <textarea
          ref={ref}
          id={id}
          aria-label="Escribí un mensaje"
          rows={1}
          className="min-h-7 min-w-0 flex-1 resize-none bg-transparent px-1 py-[5px] text-[13px] leading-[18px] text-foreground outline-none [overflow-wrap:anywhere] placeholder:text-foreground-subtle focus-visible:shadow-none"
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
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background transition-[background-color,color,box-shadow,transform] duration-(--dur-fast) hover:bg-white enabled:active:scale-95 disabled:bg-surface-elevated disabled:text-foreground-subtle disabled:shadow-[0_0_0_1px_var(--border-subtle)] pointer-coarse:size-10"
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
  if (event.clipboardData.files?.length) return Array.from(event.clipboardData.files);
  const files: File[] = [];
  for (const item of Array.from(event.clipboardData.items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}
