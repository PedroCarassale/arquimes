"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./AppShell";
import { useRememberMateria } from "@/lib/materia-snapshot";

interface MateriaLayoutProps {
  materiaId: string;
  materiaName: React.ReactNode;
  materiaInfo?: React.ReactNode;
  immersive?: boolean;
  children: React.ReactNode;
}

const tabs: { href: string; label: string }[] = [
  { href: "", label: "Resumen" },
  { href: "/apuntes", label: "Apuntes" },
  { href: "/chat", label: "Chat" },
  { href: "/preparacion", label: "Preparación" },
];

type Indicator = { left: number; width: number; ready: boolean };

let lastIndicator: Indicator | null = null;

function RememberHeader({ id, name, info }: { id: string; name: string; info?: string }) {
  useRememberMateria(id, info === undefined ? { name } : { name, info });
  return null;
}

export function MateriaLayout({
  materiaId,
  materiaName,
  materiaInfo,
  immersive = false,
  children,
}: MateriaLayoutProps) {
  const pathname = usePathname();
  const basePath = `/materias/${materiaId}`;
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [indicator, setIndicator] = useState<Indicator>(
    () => lastIndicator ?? { left: 0, width: 0, ready: false }
  );
  const activeIndex = useMemo(() => {
    const index = tabs.findIndex((tab) => {
      const href = `${basePath}${tab.href}`;
      return tab.href === ""
        ? pathname === basePath || pathname === `${basePath}/`
        : pathname.startsWith(href);
    });
    return index >= 0 ? index : 0;
  }, [basePath, pathname]);

  useLayoutEffect(() => {
    let active = true;
    const updateIndicator = () => {
      const activeTab = tabRefs.current[activeIndex];
      if (!active || !activeTab) return;
      const next = {
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
        ready: true,
      };
      lastIndicator = next;
      setIndicator((current) =>
        current.left === next.left &&
        current.width === next.width &&
        current.ready
          ? current
          : next
      );
    };

    updateIndicator();
    const raf = requestAnimationFrame(updateIndicator);
    void document.fonts?.ready.then(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeIndex, pathname]);

  return (
    <AppShell>
      {typeof materiaName === "string" && (
        <RememberHeader
          id={materiaId}
          name={materiaName}
          info={typeof materiaInfo === "string" ? materiaInfo : undefined}
        />
      )}
      <div
        className={
          immersive
            ? "flex h-[calc(100dvh-3.5rem)] min-h-[480px] flex-col overflow-hidden p-3 sm:p-4 lg:h-screen lg:min-h-[640px] lg:p-5"
            : "px-4 py-6 sm:p-6 lg:p-8"
        }
      >
        <div
          className={
            immersive
              ? "mb-2 flex min-w-0 shrink-0 items-baseline gap-3"
              : "mb-5 sm:mb-6"
          }
        >
          <div
            className={`font-mono text-xs uppercase tracking-wider text-foreground-muted ${
              immersive ? "shrink-0" : "mb-2 truncate"
            }`}
          >
            {immersive ? "Materia" : <>Materias / {materiaName}</>}
          </div>
          <div className="flex min-w-0 items-start justify-between">
            <div className="min-w-0">
              <h1
                className={`font-serif break-words ${
                  immersive ? "truncate text-xl" : "mb-1 text-2xl leading-tight sm:text-3xl"
                }`}
              >
                {materiaName}
              </h1>
              {materiaInfo && !immersive && (
                <p className="text-sm text-foreground-muted">{materiaInfo}</p>
              )}
            </div>
          </div>
        </div>

        <nav
          className={`t-tabs relative flex shrink-0 gap-5 overflow-x-auto border-b [scrollbar-width:none] sm:gap-6 border-border-subtle ${
            immersive ? "mb-2" : "mb-6 sm:mb-8"
          }`}
        >
          <span
            aria-hidden="true"
            className={`t-tabs-pill ${indicator.ready ? "is-ready" : ""}`}
            style={{
              transform: `translateX(${indicator.left}px)`,
              width: `${indicator.width}px`,
            }}
          />
          {tabs.map((tab, index) => {
            const href = `${basePath}${tab.href}`;
            const isActive = tabs[activeIndex]?.label === tab.label;

            return (
              <Link
                key={tab.label}
                href={href}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                aria-current={isActive ? "page" : undefined}
                className={`t-tab relative z-[1] whitespace-nowrap ${immersive ? "pb-2" : "pb-3"} -mb-[1px] text-sm transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className={immersive ? "min-h-0 flex-1" : undefined}>{children}</div>
      </div>
    </AppShell>
  );
}
