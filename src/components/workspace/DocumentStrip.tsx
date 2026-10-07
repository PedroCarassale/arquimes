"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type StripItem = { id: string; label: string; href: string; badge?: string };

export function DocumentStrip({
  items,
  activeId,
  allHref,
  allLabel,
  action,
}: {
  items: StripItem[];
  activeId?: string;
  allHref: string;
  allLabel: string;
  action?: React.ReactNode;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId]);

  return (
    <div className="sticky top-0 z-10 flex h-11 shrink-0 items-stretch border-b border-border-subtle bg-background/95 backdrop-blur">
      <Link
        href={allHref}
        className="flex shrink-0 items-center border-r border-border-subtle px-3 font-mono text-[10px] uppercase tracking-wider text-foreground-muted hover:text-foreground"
      >
        {allLabel}
      </Link>
      <div className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <Link
              key={item.id}
              ref={active ? activeRef : undefined}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={`flex max-w-56 shrink-0 items-center gap-2 border-r border-border-subtle px-3 text-sm transition-colors ${
                active
                  ? "bg-surface-elevated text-foreground shadow-[inset_0_-2px_0_var(--accent)]"
                  : "text-foreground-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {item.badge && (
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent">{item.badge}</span>
              )}
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {action && <div className="flex shrink-0 items-center border-l border-border-subtle px-2">{action}</div>}
    </div>
  );
}
