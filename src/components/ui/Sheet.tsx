"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./IconButton";
import { useIsClient } from "./useIsClient";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const isClient = useIsClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open || !isClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div aria-hidden="true" onClick={onClose} className="t-fade-in absolute inset-0 bg-black/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="t-sheet-in absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-xl border-t border-white/[0.08] bg-surface-overlay pb-[env(safe-area-inset-bottom)] shadow-pop outline-none focus-visible:shadow-pop"
      >
        <div className="flex shrink-0 justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-border-strong" />
        </div>
        {title && (
          <div className="flex h-12 shrink-0 items-center justify-between pl-4 pr-2">
            <h2 className="truncate text-sm font-medium">{title}</h2>
            <IconButton icon="x" label="Cerrar" size={40} onClick={onClose} />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}
