"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Inicio", icon: "◇", enabled: true },
  { href: "/materias", label: "Materias", icon: "▫", enabled: true },
  { href: "#", label: "Plan", icon: "□", enabled: false },
  { href: "#", label: "Práctica", icon: "○", enabled: false },
  { href: "#", label: "Parciales", icon: "▫", enabled: false },
  { href: "/archivos", label: "Archivos", icon: "□", enabled: true },
  { href: "#", label: "Chats", icon: "○", enabled: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[180px] bg-background border-r border-border-subtle flex flex-col">
      <div className="p-6">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Arquimes
        </Link>
      </div>

      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href) && item.href !== "#";

          if (!item.enabled) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2 text-foreground-subtle cursor-not-allowed"
              >
                <span className="text-xs opacity-50">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                isActive
                  ? "bg-surface-elevated text-foreground"
                  : "text-foreground-muted hover:text-foreground hover:bg-surface"
              }`}
            >
              <span className="text-xs">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-sm font-medium">
            P
          </div>
          <div>
            <div className="text-sm font-medium">Pedro</div>
            <div className="text-xs text-foreground-muted">Mi perfil →</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
