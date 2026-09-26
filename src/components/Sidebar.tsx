"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

type IconProps = { className?: string };

function HomeIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 11.5L12 4l9 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 10.5V20h9v-9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5.5 5A2.5 2.5 0 018 2.5h10.5V19H8a2.5 2.5 0 100 5h10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 2.5V24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 7.5h6l2 2H21v8.5A2.5 2.5 0 0118.5 20h-13A2.5 2.5 0 013 17.5v-10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M21 12a7.5 7.5 0 01-7.5 7.5H7l-4 2v-4.5A7.5 7.5 0 0110.5 4.5h3A7.5 7.5 0 0121 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DotsIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18.5" r="1.5" />
    </svg>
  );
}

function UserIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 19a6.5 6.5 0 0113 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 6.5h-4a2.5 2.5 0 00-2.5 2.5v6A2.5 2.5 0 006 17.5h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 9.5L17 12l-3.5 2.5M9 12h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const materiaId = pathname.match(/^\/materias\/([^/]+)/)?.[1];
  const isMateriasChatPicker = pathname === "/materias/chats";
  const chatHref = materiaId ? `/materias/${materiaId}/chat` : "/materias/chats";

  const items = useMemo(
    () => [
      { href: "/", label: "Inicio", Icon: HomeIcon },
      { href: "/materias", label: "Materias", Icon: BookIcon },
      { href: "/archivos", label: "Archivos", Icon: FolderIcon },
      { href: chatHref, label: "Chats", Icon: ChatIcon },
    ],
    [chatHref]
  );

  const profileName = session?.user?.name?.trim() || "Cuenta";
  const profileInitial = profileName[0]?.toUpperCase() || "U";
  const profileEmail = session?.user?.email || "Sesión activa";
  const profileImage =
    typeof session?.user?.image === "string" && session.user.image.trim()
      ? session.user.image
      : null;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[208px] bg-background border-r border-border-subtle flex flex-col">
      <div className="p-6">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Arquimes
        </Link>
      </div>

      <nav className="flex-1 px-3">
        {items.map((item) => {
          const isChatItem = item.label === "Chats";
          const isMateriasItem = item.label === "Materias";
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : isChatItem
                ? pathname.includes("/chat") || isMateriasChatPicker
                : isMateriasItem
                  ? pathname.startsWith("/materias") &&
                    !pathname.includes("/chat") &&
                    !isMateriasChatPicker
                  : pathname.startsWith(item.href);
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
              <item.Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-border-subtle p-4" ref={menuRef}>
        <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-2 py-2">
          {profileImage ? (
            <img
              src={profileImage}
              alt={`Avatar de ${profileName}`}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-full bg-surface-elevated flex items-center justify-center text-sm font-medium">
              {profileInitial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium" title={profileName}>
              {profileName}
            </div>
            <div className="truncate text-xs text-foreground-muted" title={profileEmail}>
              {profileEmail}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Abrir menú de cuenta"
            className="shrink-0 rounded-md border border-border-subtle p-2 text-foreground-muted transition-colors hover:border-border hover:text-foreground"
          >
            <DotsIcon />
          </button>
        </div>

        {menuOpen && (
          <div
            role="menu"
            className="absolute bottom-[78px] right-4 z-10 w-44 overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg"
          >
            <Link
              href="/perfil"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <UserIcon />
              Ver perfil
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                void handleSignOut();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <LogoutIcon />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
