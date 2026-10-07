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

function MenuIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

let cachedMaterias: { id: string; name: string }[] | null = null;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);
  const menuRef = useRef<HTMLDivElement>(null);
  const materiaId = pathname.match(/^\/materias\/([^/]+)/)?.[1];
  const [materias, setMaterias] = useState<{ id: string; name: string }[] | null>(cachedMaterias);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/materias", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then((list: { id: string; name: string }[]) => {
        if (cancelled || !Array.isArray(list)) return;
        cachedMaterias = list.map(({ id, name }) => ({ id, name }));
        setMaterias(cachedMaterias);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const items = useMemo(
    () => [
      { href: "/", label: "Tus materias", Icon: HomeIcon },
      { href: "/archivos", label: "Archivos", Icon: FolderIcon },
    ],
    []
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

  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [drawerOpen]);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-background/95 px-4 backdrop-blur lg:hidden">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Arquimedes
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={drawerOpen}
          aria-controls="app-sidebar"
          className="-mr-2 flex h-10 w-10 items-center justify-center text-foreground-muted transition-colors hover:text-foreground"
        >
          <MenuIcon />
        </button>
      </header>
      {drawerOpen && (
        <div
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}
      <aside
        id="app-sidebar"
        className={`fixed left-0 top-0 bottom-0 z-50 flex w-[260px] max-w-[85vw] flex-col border-r border-border-subtle bg-background transition-transform duration-200 ease-out lg:z-auto lg:w-[208px] lg:translate-x-0 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full max-lg:invisible"
        }`}
      >
        <div className="flex items-center justify-between p-6 max-lg:px-4 max-lg:py-3">
          <Link href="/" className="font-serif text-xl tracking-tight">
            Arquimedes
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="-mr-2 flex h-10 w-10 items-center justify-center text-foreground-muted transition-colors hover:text-foreground lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col px-3">
          {items.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" || pathname === "/materias" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 transition-colors lg:py-2 ${
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
          <div className="mt-6 flex items-center justify-between px-3 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">Materias</span>
            <Link
              href="/materias/nueva"
              aria-label="Nueva materia"
              title="Nueva materia"
              className="font-mono text-xs text-foreground-muted hover:text-accent"
            >
              +
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            {materias === null ? null : materias.length === 0 ? (
              <Link href="/materias/nueva" className="block px-3 py-2 text-sm text-foreground-muted hover:text-accent">
                Crear tu primera materia
              </Link>
            ) : (
              materias.map((materia) => {
                const active = materia.id === materiaId;
                return (
                  <Link
                    key={materia.id}
                    href={`/materias/${materia.id}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-surface-elevated text-foreground shadow-[inset_2px_0_0_var(--accent)]"
                        : "text-foreground-muted hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    <BookIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{materia.name}</span>
                  </Link>
                );
              })
            )}
          </div>
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
    </>
  );
}
