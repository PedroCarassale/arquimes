"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { useIsClient } from "./useIsClient";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
};

export function Modal({ open, onClose, title, description, children, footer, width = 440 }: ModalProps) {
  const isClient = useIsClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open || !isClient) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!panel.contains(document.activeElement)) {
      const preferred = panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel.querySelector<HTMLElement>(FOCUSABLE);
      (preferred ?? panel).focus({ preventScroll: true });
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, isClient]);

  if (!open || !isClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-start justify-center overflow-y-auto px-4 pb-8 pt-[18vh]">
      <div aria-hidden="true" onClick={onClose} className="t-fade-in fixed inset-0 bg-black/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        style={{ maxWidth: width }}
        className="t-pop-in relative w-full rounded-xl border border-white/[0.08] bg-surface-overlay p-5 shadow-pop outline-none focus-visible:shadow-pop"
      >
        <h2 id={titleId} className="text-base font-medium text-foreground">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-1.5 text-sm leading-6 text-foreground-muted">
            {description}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-5 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Borrar",
  cancelLabel = "Cancelar",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onCancel}
      title={title}
      description={body}
      width={400}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy} data-autofocus={tone === "danger" ? true : undefined}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => void confirm()}
            loading={busy}
            data-autofocus={tone === "default" ? true : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
