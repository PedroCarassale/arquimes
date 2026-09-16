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

const tabs: { href: string; label: string; disabled?: boolean }[] = [
  { href: "", label: "Resumen" },
  { href: "/programa", label: "Programa y temas", disabled: true },
  { href: "/apuntes", label: "Apuntes" },
  { href: "/examenes", label: "Exámenes" },
  { href: "/practica", label: "Práctica" },
  { href: "/chat", label: "Chat" },
  { href: "/miembros", label: "Miembros", disabled: true },
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
        <div className={immersive ? "mb-3 shrink-0" : "mb-6"}>
          <div
            className={`font-mono text-xs uppercase tracking-wider text-foreground-muted ${
              immersive ? "mb-1" : "mb-2"
            }`}
          >
            Materias / {materiaName}
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className={`mb-1 font-serif ${immersive ? "text-2xl" : "text-3xl"}`}>
                {materiaName}
              </h1>
              {materiaInfo && (
                <p className="text-sm text-foreground-muted">{materiaInfo}</p>
              )}
            </div>
          </div>
        </div>

        <nav
          className={`flex shrink-0 gap-6 overflow-x-auto border-b border-border-subtle ${
            immersive ? "mb-3" : "mb-8"
          }`}
        >
          {tabs.map((tab) => {
            const href = `${basePath}${tab.href}`;
            const isActive = tab.href === ""
              ? pathname === basePath || pathname === `${basePath}/`
              : pathname.startsWith(href);

            if (tab.disabled) {
              return (
                <span
                  key={tab.label}
                  className="pb-3 text-sm text-foreground-subtle cursor-not-allowed"
                >
                  {tab.label}
                </span>
              );
            }

            return (
              <Link
                key={tab.label}
                href={href}
                className={`pb-3 text-sm transition-colors border-b-2 -mb-[1px] ${
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
