import type { ButtonHTMLAttributes, Ref } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import { Tooltip } from "./Tooltip";

export type IconButtonProps = {
  icon: IconName;
  label: string;
  size?: 24 | 28 | 32 | 40;
  variant?: "ghost" | "secondary";
  shortcut?: string;
  tooltipSide?: "top" | "right" | "bottom";
  ref?: Ref<HTMLButtonElement>;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const SIZES = {
  24: "h-6 w-6 rounded-sm pointer-coarse:h-10 pointer-coarse:w-10",
  28: "h-7 w-7 rounded-md pointer-coarse:h-10 pointer-coarse:w-10",
  32: "h-8 w-8 rounded-md pointer-coarse:h-10 pointer-coarse:w-10",
  40: "h-10 w-10 rounded-md",
} as const;

const VARIANTS = {
  ghost: "text-foreground-muted hover:bg-hover hover:text-foreground active:bg-pressed",
  secondary: "bg-hover text-foreground hover:bg-selected active:bg-pressed",
} as const;

export function IconButton({
  icon,
  label,
  size = 32,
  variant = "ghost",
  shortcut,
  tooltipSide,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <Tooltip label={label} shortcut={shortcut} side={tooltipSide}>
      <button
        type={type}
        aria-label={label}
        className={cx(
          "inline-flex shrink-0 items-center justify-center transition-colors duration-(--dur-fast) ease-(--ease-out) disabled:opacity-50",
          SIZES[size],
          VARIANTS[variant],
          className
        )}
        {...rest}
      >
        <Icon name={icon} size={size === 24 ? 14 : 16} />
      </button>
    </Tooltip>
  );
}
