import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type EmptyStateProps = {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: "sm" | "lg";
  className?: string;
};

export function EmptyState({ icon, title, description, action, size = "lg", className }: EmptyStateProps) {
  const large = size === "lg";
  return (
    <div className={cx("flex flex-col items-center text-center", large ? "px-6 py-16" : "px-4 py-8", className)}>
      {icon && (
        <span
          className={cx(
            "mb-4 inline-flex items-center justify-center rounded-lg bg-hover text-foreground-muted",
            large ? "h-12 w-12" : "h-10 w-10"
          )}
        >
          <Icon name={icon} size={large ? 20 : 18} />
        </span>
      )}
      <p className={cx("text-foreground", large ? "font-serif text-[22px] leading-7" : "text-sm font-medium")}>{title}</p>
      {description && (
        <p className={cx("mt-1.5 max-w-sm text-foreground-muted", large ? "text-sm leading-6" : "text-[13px] leading-5")}>
          {description}
        </p>
      )}
      {action && <div className={large ? "mt-6" : "mt-4"}>{action}</div>}
    </div>
  );
}
