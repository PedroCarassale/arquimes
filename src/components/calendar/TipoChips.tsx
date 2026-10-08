"use client";

import type { KeyboardEvent } from "react";
import { Icon, cx } from "@/components/ui";
import type { EvaluacionKind, ExamType } from "@/lib/types";
import { KIND_OPTIONS, TYPE_OPTIONS, kindIcon } from "./eventos";

type Option<T extends string> = { value: T; label: string };

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onSelect,
  icons,
  size,
}: {
  label: string;
  options: Option<T>[];
  value: T | undefined;
  onSelect: (value: T) => void;
  icons?: boolean;
  size: "md" | "sm";
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (Math.max(index, 0) + delta + options.length) % options.length;
    onSelect(options[nextIndex].value);
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[nextIndex]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-1.5">
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (value === undefined && index === 0) ? 0 : -1}
            onClick={() => onSelect(option.value)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full transition-colors duration-(--dur-fast) ease-(--ease-out) pointer-coarse:min-h-10",
              size === "md" ? "h-7 px-3 text-[13px]" : "h-6 px-2.5 text-xs",
              checked
                ? "bg-selected text-foreground"
                : "text-foreground-muted shadow-[inset_0_0_0_1px_var(--border-subtle)] hover:bg-hover hover:text-foreground"
            )}
          >
            {icons && <Icon name={kindIcon(option.value as EvaluacionKind)} size={14} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function TipoChips({
  kind,
  type,
  onChange,
}: {
  kind: EvaluacionKind;
  type: ExamType | undefined;
  onChange: (kind: EvaluacionKind, type: ExamType | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <ChipGroup
        label="Tipo"
        options={KIND_OPTIONS}
        value={kind}
        icons
        size="md"
        onSelect={(next) => onChange(next, next === "examen" ? type : undefined)}
      />
      {kind === "examen" && (
        <ChipGroup
          label="Subtipo de examen"
          options={TYPE_OPTIONS}
          value={type}
          size="sm"
          onSelect={(next) => onChange("examen", next === type ? undefined : next)}
        />
      )}
    </div>
  );
}
