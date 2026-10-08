import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type PillProps = {
  tone?: "neutral" | "accent";
  size?: "sm" | "md";
  icon?: IconName;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
  children: ReactNode;
};

export function Pill({ tone = "neutral", size = "md", icon, onRemove, removeLabel = "Quitar", className, children }: PillProps) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-1 rounded-full",
        tone === "accent" ? "bg-accent-muted text-accent" : "bg-hover text-foreground-muted",
        size === "sm" ? "h-5 px-2 text-[11px]" : "h-6 px-2.5 text-xs",
        onRemove && (size === "sm" ? "pr-0.5" : "pr-1"),
        className
      )}
    >
      {icon && <Icon name={icon} size={12} />}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-foreground-subtle transition-colors hover:bg-selected hover:text-foreground pointer-coarse:h-6 pointer-coarse:w-6"
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </span>
  );
}
