import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode, Ref } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type VisualProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent font-medium text-[#0a0a0a] hover:bg-accent-hover",
  secondary: "bg-hover text-foreground hover:bg-selected active:bg-pressed",
  ghost: "text-foreground-muted hover:bg-hover hover:text-foreground active:bg-pressed",
  danger: "text-danger hover:bg-danger-muted",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-7 gap-1.5 px-2.5 text-[13px] pointer-coarse:min-h-10",
  md: "h-8 gap-2 px-3 text-sm pointer-coarse:min-h-10",
  lg: "h-10 gap-2 px-4 text-sm",
};

export function buttonClasses({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  return cx(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md transition-colors duration-(--dur-fast) ease-(--ease-out) disabled:opacity-50 aria-disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

function Spinner({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" className="t-spinner shrink-0">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M20 12a8 8 0 0 0-8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ButtonContent({
  size = "md",
  icon,
  iconRight,
  loading,
  children,
}: Pick<VisualProps, "size" | "icon" | "iconRight" | "loading"> & { children?: ReactNode }) {
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <>
      {loading ? <Spinner size={iconSize} /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </>
  );
}

export type ButtonProps = VisualProps & ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> };

export function Button({
  variant,
  size,
  icon,
  iconRight,
  loading = false,
  className,
  type = "button",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      <ButtonContent size={size} icon={icon} iconRight={iconRight} loading={loading}>
        {children}
      </ButtonContent>
    </button>
  );
}

export type ButtonLinkProps = VisualProps & { href: string } & Omit<ComponentProps<typeof Link>, "href">;

export function ButtonLink({ variant, size, icon, iconRight, loading, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...rest}>
      <ButtonContent size={size} icon={icon} iconRight={iconRight} loading={loading}>
        {children}
      </ButtonContent>
    </Link>
  );
}
