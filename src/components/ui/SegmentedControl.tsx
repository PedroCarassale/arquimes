"use client";

import type { KeyboardEvent } from "react";
import { cx } from "./cx";

export type SegmentedControlProps<T extends string> = {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
  ariaLabel: string;
  className?: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = options[(index + delta + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]");
    buttons[options.indexOf(next)]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx("inline-flex shrink-0 items-center gap-0.5 rounded-md bg-hover p-0.5", className)}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm transition-colors duration-(--dur-fast) ease-(--ease-out) pointer-coarse:min-h-10",
              size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-[13px]",
              checked ? "bg-selected text-foreground" : "text-foreground-muted hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
