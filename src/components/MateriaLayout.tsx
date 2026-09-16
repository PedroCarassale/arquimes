"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

interface MateriaLayoutProps {
  materiaId: string;
  materiaName: string;
  materiaInfo?: string;
  immersive?: boolean;
  children: React.ReactNode;
}

const tabs: { href: string; label: string }[] = [
  { href: "", label: "Resumen" },
  { href: "/apuntes", label: "Apuntes" },
  { href: "/chat", label: "Chat" },
  { href: "/preparacion", label: "Preparación" },
];

export function MateriaLayout({
  materiaId,
  materiaName,
  materiaInfo,
  immersive = false,
  children,
}: MateriaLayoutProps) {
  const pathname = usePathname();
  const basePath = `/materias/${materiaId}`;

  return (
    <AppShell>
      <div
        className={
          immersive
            ? "flex min-h-screen flex-col p-4 lg:h-screen lg:min-h-[640px] lg:overflow-hidden lg:p-5"
            : "p-8"
        }
      >
        <div
          className={
            immersive
              ? "mb-2 flex shrink-0 items-baseline gap-3"
              : "mb-6"
          }
        >
          <div
            className={`font-mono text-xs uppercase tracking-wider text-foreground-muted ${
              immersive ? "shrink-0" : "mb-2"
            }`}
          >
            {immersive ? "Materia" : `Materias / ${materiaName}`}
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className={`font-serif ${immersive ? "text-xl" : "mb-1 text-3xl"}`}>
                {materiaName}
              </h1>
              {materiaInfo && !immersive && (
                <p className="text-sm text-foreground-muted">{materiaInfo}</p>
              )}
            </div>
          </div>
        </div>

        <nav
          className={`flex shrink-0 gap-6 overflow-x-auto border-b border-border-subtle ${
            immersive ? "mb-2" : "mb-8"
          }`}
        >
          {tabs.map((tab) => {
            const href = `${basePath}${tab.href}`;
            const isActive = tab.href === ""
              ? pathname === basePath || pathname === `${basePath}/`
              : pathname.startsWith(href);

            return (
              <Link
                key={tab.label}
                href={href}
                className={`${immersive ? "pb-2" : "pb-3"} -mb-[1px] border-b-2 text-sm transition-colors ${
                  isActive
                    ? "text-foreground border-foreground"
                    : "text-foreground-muted border-transparent hover:text-foreground"
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
