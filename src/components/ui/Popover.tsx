"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";
import { Sheet } from "./Sheet";
import { MOBILE_QUERY, useIsClient, useMediaQuery } from "./useIsClient";

export type PopoverPlacement = "bottom-start" | "bottom-end" | "right-start";

export type PopoverProps = {
  open: boolean;
  onClose: () => void;
  anchor: HTMLElement | DOMRect | null;
  placement?: PopoverPlacement;
  width?: number;
  title?: string;
  className?: string;
  children: ReactNode;
};

const GAP = 6;
const EDGE = 8;

function anchorRect(anchor: HTMLElement | DOMRect | null): DOMRect | null {
  if (!anchor) return null;
  return anchor instanceof DOMRect ? anchor : anchor.getBoundingClientRect();
}

function place(panel: HTMLElement, anchor: HTMLElement | DOMRect | null, placement: PopoverPlacement) {
  const rect = anchorRect(anchor);
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left: number;
  let top: number;
  let origin: string;
  if (!rect) {
    left = (vw - width) / 2;
    top = Math.max(EDGE, vh * 0.2);
    origin = "top center";
  } else if (placement === "right-start") {
    left = rect.right + GAP;
    if (left + width > vw - EDGE) left = rect.left - GAP - width;
    top = rect.top;
    if (top + height > vh - EDGE) top = vh - EDGE - height;
    origin = "top left";
  } else {
    left = placement === "bottom-end" ? rect.right - width : rect.left;
    top = rect.bottom + GAP;
    origin = placement === "bottom-end" ? "top right" : "top left";
    if (top + height > vh - EDGE && rect.top - GAP - height >= EDGE) {
      top = rect.top - GAP - height;
      origin = placement === "bottom-end" ? "bottom right" : "bottom left";
    }
  }
  left = Math.min(Math.max(EDGE, left), Math.max(EDGE, vw - EDGE - width));
  top = Math.min(Math.max(EDGE, top), Math.max(EDGE, vh - EDGE - height));
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
  panel.style.transformOrigin = origin;
}

export function Popover({
  open,
  onClose,
  anchor,
  placement = "bottom-start",
  width,
  title,
  className,
  children,
}: PopoverProps) {
  const isClient = useIsClient();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const sheet = isMobile;

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || sheet || !panel) return;
    const reposition = () => place(panel, anchor, placement);
    reposition();
    if (!panel.contains(document.activeElement)) panel.focus({ preventScroll: true });

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target || panel?.contains(target)) return;
      if (anchor instanceof HTMLElement && anchor.contains(target)) return;
      onCloseRef.current();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onCloseRef.current();
    }
    const observer = new ResizeObserver(reposition);
    observer.observe(panel);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      const active = document.activeElement;
      if (anchor instanceof HTMLElement && anchor.isConnected && (!active || active === document.body || panel.contains(active))) {
        anchor.focus({ preventScroll: true });
      }
    };
  }, [open, sheet, anchor, placement, isClient]);

  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} title={title}>
        {children}
      </Sheet>
    );
  }

  if (!open || !isClient) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      style={{ width, left: 0, top: 0 }}
      className={cx(
        "t-pop-in fixed z-[60] max-h-[min(560px,calc(100vh-16px))] overflow-y-auto rounded-lg border border-white/[0.08] bg-surface-overlay text-sm shadow-pop outline-none focus-visible:shadow-pop",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}
