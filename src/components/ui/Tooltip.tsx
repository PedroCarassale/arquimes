"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { createPortal } from "react-dom";

type Side = "top" | "right" | "bottom";

const GAP = 6;
const EDGE = 8;

function placement(rect: DOMRect, side: Side): CSSProperties {
  if (side === "right") {
    return { left: rect.right + GAP + 2, top: rect.top + rect.height / 2, transform: "translateY(-50%)" };
  }
  const center = Math.min(window.innerWidth - EDGE, Math.max(EDGE, rect.left + rect.width / 2));
  const align =
    center < 120 ? "translateX(0)" : center > window.innerWidth - 120 ? "translateX(-100%)" : "translateX(-50%)";
  const left = center < 120 ? Math.max(EDGE, rect.left) : center > window.innerWidth - 120 ? Math.min(window.innerWidth - EDGE, rect.right) : center;
  if (side === "top") return { left, bottom: window.innerHeight - rect.top + GAP, transform: align };
  return { left, top: rect.bottom + GAP, transform: align };
}

export function Tooltip({
  label,
  shortcut,
  side = "bottom",
  children,
}: {
  label: string;
  shortcut?: string;
  side?: Side;
  children: ReactElement;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  function clear() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function show() {
    clear();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const target = wrapRef.current?.firstElementChild;
      if (target) setRect(target.getBoundingClientRect());
    }, 400);
  }

  function hide() {
    clear();
    setRect(null);
  }

  useEffect(() => clear, []);

  useEffect(() => {
    if (!rect) return;
    const close = () => setRect(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [rect]);

  return (
    <span
      ref={wrapRef}
      className="contents"
      onPointerOver={(event) => {
        if (event.pointerType === "touch" || rect || timer.current !== null) return;
        show();
      }}
      onPointerOut={(event) => {
        if (wrapRef.current?.contains(event.relatedTarget as Node | null)) return;
        hide();
      }}
      onFocus={(event) => {
        if ((event.target as Element).matches?.(":focus-visible")) show();
      }}
      onBlur={hide}
      onPointerDown={hide}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      {children}
      {rect &&
        createPortal(
          <span
            role="tooltip"
            style={placement(rect, side)}
            className="t-tooltip pointer-events-none fixed z-[80] flex max-w-[260px] items-center gap-2 whitespace-nowrap rounded-sm border border-white/[0.08] bg-surface-overlay px-2 py-1 text-xs text-foreground shadow-pop"
          >
            <span className="truncate">{label}</span>
            {shortcut && <span className="font-mono text-[11px] text-foreground-subtle">{shortcut}</span>}
          </span>,
          document.body
        )}
    </span>
  );
}
