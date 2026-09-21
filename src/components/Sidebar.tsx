"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const navItems = [
  { href: "/", label: "Inicio", icon: "◇", enabled: true },
  { href: "/materias", label: "Materias", icon: "▫", enabled: true },
  { href: "#", label: "Plan", icon: "□", enabled: false },
  { href: "#", label: "Práctica", icon: "○", enabled: false },
  { href: "#", label: "Parciales", icon: "▫", enabled: false },
  { href: "/archivos", label: "Archivos", icon: "□", enabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const materiaId = pathname.match(/^\/materias\/([^/]+)/)?.[1];
  const chatHref = materiaId ? `/materias/${materiaId}/chat` : "/materias";
  const items = [
    ...navItems,
    { href: chatHref, label: "Chats", icon: "○", enabled: true },
  ];

  const profileName = session?.user?.name?.trim() || "Cuenta";
  const profileInitial = profileName[0]?.toUpperCase() || "U";
  const profileEmail = session?.user?.email || "Sesión activa";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[180px] bg-background border-r border-border-subtle flex flex-col">
      <div className="p-6">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Arquimes
        </Link>
      </div>

      <nav className="flex-1 px-3">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href.startsWith("#")
              ? false
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
            {profileInitial}
          </div>
          <div>
            <div className="text-sm font-medium truncate">{profileName}</div>
            <div className="text-xs text-foreground-muted truncate">{profileEmail}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleSignOut();
          }}
          className="mt-3 text-xs text-foreground-muted hover:text-foreground"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
