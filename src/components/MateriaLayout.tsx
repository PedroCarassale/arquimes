"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

interface MateriaLayoutProps {
  materiaId: string;
  materiaName: string;
  materiaInfo?: string;
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
  children,
}: MateriaLayoutProps) {
  const pathname = usePathname();
  const basePath = `/materias/${materiaId}`;

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
            Materias / {materiaName}
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-serif text-3xl mb-1">{materiaName}</h1>
              {materiaInfo && (
                <p className="text-sm text-foreground-muted">{materiaInfo}</p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex gap-6 border-b border-border-subtle mb-8">
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

        {children}
      </div>
    </AppShell>
  );
}
