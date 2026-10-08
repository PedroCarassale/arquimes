"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactElement } from "react";
import { cx } from "./cx";
import { IconButton } from "./IconButton";

export type ToastInput = {
  message: string;
  action?: { label: string; href?: string; onClick?: () => void };
  tone?: "default" | "error";
};

type ToastItem = ToastInput & { id: number };

const DURATION = 5000;
const MAX_VISIBLE = 4;
const EMPTY: ToastItem[] = [];

let toasts: ToastItem[] = EMPTY;
let sequence = 0;
const listeners = new Set<() => void>();
const timers = new Map<number, number>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function schedule(id: number) {
  if (typeof window === "undefined") return;
  window.clearTimeout(timers.get(id));
  timers.set(id, window.setTimeout(() => dismissToast(id), DURATION));
}

function pause(id: number) {
  window.clearTimeout(timers.get(id));
  timers.delete(id);
}

export function dismissToast(id: number) {
  window.clearTimeout(timers.get(id));
  timers.delete(id);
  const next = toasts.filter((item) => item.id !== id);
  if (next.length === toasts.length) return;
  toasts = next.length ? next : EMPTY;
  emit();
}

export function toast(input: ToastInput): void {
  sequence += 1;
  const item: ToastItem = { ...input, id: sequence };
  const next = [...toasts, item];
  for (const dropped of next.slice(0, Math.max(0, next.length - MAX_VISIBLE))) pause(dropped.id);
  toasts = next.slice(-MAX_VISIBLE);
  emit();
  schedule(item.id);
}

export function Toaster(): ReactElement {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 md:inset-x-auto md:right-5 md:bottom-5 md:items-end"
    >
      {items.map((item) => (
        <div
          key={item.id}
          onPointerEnter={() => pause(item.id)}
          onPointerLeave={() => schedule(item.id)}
          className="t-pop-in pointer-events-auto flex min-h-11 w-full max-w-[420px] items-center gap-1 rounded-lg border border-white/[0.08] bg-surface-overlay py-1.5 pl-4 pr-1.5 text-sm shadow-pop md:w-auto"
        >
          <span className={cx("min-w-0 flex-1 py-1 leading-5", item.tone === "error" ? "text-danger" : "text-foreground")}>
            {item.message}
          </span>
          {item.action &&
            (item.action.href ? (
              <Link
                href={item.action.href}
                onClick={() => {
                  item.action?.onClick?.();
                  dismissToast(item.id);
                }}
                className="inline-flex h-7 shrink-0 items-center rounded-md px-2 text-sm font-medium text-accent transition-colors hover:bg-hover pointer-coarse:h-10"
              >
                {item.action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  item.action?.onClick?.();
                  dismissToast(item.id);
                }}
                className="inline-flex h-7 shrink-0 items-center rounded-md px-2 text-sm font-medium text-accent transition-colors hover:bg-hover pointer-coarse:h-10"
              >
                {item.action.label}
              </button>
            ))}
          <IconButton icon="x" label="Cerrar aviso" size={28} tooltipSide="top" onClick={() => dismissToast(item.id)} />
        </div>
      ))}
    </div>
  );
}
