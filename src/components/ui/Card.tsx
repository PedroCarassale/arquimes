import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";

export type CardProps = {
  as?: "div" | "a" | "button";
  href?: string;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export function Card({ as, href, interactive, className, children, onClick }: CardProps) {
  const element = as ?? (href ? "a" : onClick ? "button" : "div");
  const isInteractive = interactive ?? element !== "div";
  const classes = cx(
    "block rounded-lg border border-border-subtle bg-surface text-left",
    isInteractive && "transition-colors duration-(--dur-fast) ease-(--ease-out) hover:border-border hover:bg-surface-elevated",
    className
  );
  if (element === "a" && href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }
  if (element === "button") {
    return (
      <button type="button" className={cx(classes, "w-full")} onClick={onClick}>
        {children}
      </button>
    );
  }
  return <div className={classes}>{children}</div>;
}
