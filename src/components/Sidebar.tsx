"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { materiaTone } from "@/lib/materia-tone";
import { HUB_KEY, useMateriaSnapshots } from "@/lib/materia-snapshot";
import { rutas } from "@/lib/routes";
import { tabKey, tabKindFromPath, type Tab, type TabKind } from "@/lib/tabs";
import { cx } from "@/components/ui/cx";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { Tooltip } from "@/components/ui/Tooltip";
import { useMediaQuery } from "@/components/ui/useIsClient";
import { tabsStore } from "@/components/workspace/tabs-store";

type MateriaLite = { id: string; name: string };
type Pref = "1" | "0" | null;

const COLLAPSED_KEY = "arq.sidebar.collapsed";
const COLLAPSED_EVENT = "arq-sidebar";
const NARROW_QUERY = "(max-width: 1279px)";

let memoryPref: Pref = null;
let memoryOnly = false;
let animated = false;
let cachedMaterias: MateriaLite[] | null = null;

function readPref(): Pref {
  if (memoryOnly) return memoryPref;
  try {
    const value = window.localStorage.getItem(COLLAPSED_KEY);
    return value === "1" || value === "0" ? value : null;
  } catch {
    return memoryPref;
  }
}

function writePref(value: "1" | "0") {
  memoryPref = value;
  try {
    window.localStorage.setItem(COLLAPSED_KEY, value);
  } catch {
    memoryOnly = true;
  }
  animated = true;
  window.dispatchEvent(new Event(COLLAPSED_EVENT));
}

function subscribePref(callback: () => void) {
  window.addEventListener(COLLAPSED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLLAPSED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const serverPref = (): Pref => null;
const readAnimated = () => animated;
const serverAnimated = () => false;

export function materiaIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/materias\/([^/]+)/);
  return match && match[1] !== "nueva" ? match[1] : null;
}

export function useSidebarLayout(): { collapsed: boolean; animate: boolean; toggle: () => void } {
  const pathname = usePathname();
  const pref = useSyncExternalStore(subscribePref, readPref, serverPref);
  const animate = useSyncExternalStore(subscribePref, readAnimated, serverAnimated);
  const narrow = useMediaQuery(NARROW_QUERY);
  const collapsed = pref === "1" || (pref === null && materiaIdFromPath(pathname) !== null && narrow);
  const toggle = useCallback(() => writePref(collapsed ? "0" : "1"), [collapsed]);
  return { collapsed, animate, toggle };
}

type Seccion = { label: string; icon: IconName; base: (m: string) => string; kinds: TabKind[] };

const SECCIONES: Seccion[] = [
  { label: "Inicio", icon: "home", base: rutas.materia, kinds: ["inicio"] },
  { label: "Clases", icon: "clase", base: rutas.clases, kinds: ["clases", "clase"] },
  { label: "Apuntes", icon: "apunte", base: (m) => rutas.apuntes(m), kinds: ["apuntes", "archivo", "generado"] },
  { label: "Calendario", icon: "calendario", base: (m) => rutas.calendario(m), kinds: ["calendario", "evento"] },
];

const CONECTORES = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "a", "en", "para"]);

function iniciales(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word && !CONECTORES.has(word.toLowerCase()));
  if (words.length === 0) return "·";
  const first = Array.from(words[0]);
  const second = words[1] ? Array.from(words[1])[0] : first[1] ?? "";
  return `${first[0]}${second}`.toUpperCase();
}

const ROW =
  "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-(--dur-fast) ease-(--ease-out) pointer-coarse:h-10";

function rowTone(active: boolean) {
  return active ? "bg-selected text-foreground" : "text-foreground-muted hover:bg-hover hover:text-foreground";
}

function NavRow({ href, icon, label, active }: { href: string; icon: IconName; label: string; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cx(ROW, rowTone(active))}>
      <Icon name={icon} size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function RailLink({
  href,
  label,
  active = false,
  size = 40,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  size?: 32 | 40;
  children: ReactNode;
}) {
  return (
    <Tooltip label={label} side="right">
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cx(
          "inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-(--dur-fast) ease-(--ease-out)",
          size === 40 ? "h-10 w-10" : "h-8 w-8",
          rowTone(active)
        )}
      >
        {children}
      </Link>
    </Tooltip>
  );
}

function ToneDot({ id, className }: { id: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("h-1.5 w-1.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: materiaTone(id).color }}
    />
  );
}

function useMaterias(fetchKey: string, activeId: string | null): MateriaLite[] | null {
  const snapshots = useMateriaSnapshots();
  const [materias, setMaterias] = useState<MateriaLite[] | null>(cachedMaterias);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/materias", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((list: unknown) => {
        if (cancelled || !Array.isArray(list)) return;
        cachedMaterias = list
          .filter((item): item is MateriaLite => typeof item?.id === "string" && typeof item?.name === "string")
          .map(({ id, name }) => ({ id, name }));
        setMaterias(cachedMaterias);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  return useMemo(() => {
    let list = materias;
    if (!list && snapshots) {
      const ids = snapshots.get(HUB_KEY)?.materiaIds;
      if (ids) {
        list = ids.flatMap((id) => {
          const name = snapshots.get(id)?.name;
          return name ? [{ id, name }] : [];
        });
      }
    }
    if (activeId && list && !list.some((item) => item.id === activeId)) {
      const name = snapshots?.get(activeId)?.name;
      if (name) list = [...list, { id: activeId, name }];
    }
    return list;
  }, [materias, snapshots, activeId]);
}

function useSeccionHrefs(materiaId: string | null): string[] {
  const tabs = useSyncExternalStore(
    tabsStore.subscribe,
    () => (materiaId ? tabsStore.getSnapshot(materiaId) : tabsStore.getServerSnapshot()),
    tabsStore.getServerSnapshot
  );
  return useMemo(() => {
    if (!materiaId) return [];
    return SECCIONES.map((seccion) => {
      const base = seccion.base(materiaId);
      const saved = tabs.find((tab: Tab) => tabKey(tab.href) === tabKey(base));
      return saved?.href ?? base;
    });
  }, [materiaId, tabs]);
}

function Avatar({ name, image, size }: { name: string; image: string | null; size: 28 | 32 }) {
  const classes = size === 32 ? "h-8 w-8 text-[13px]" : "h-7 w-7 text-xs";
  if (image) {
    return <img src={image} alt="" className={cx("shrink-0 rounded-full object-cover", classes)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cx("flex shrink-0 items-center justify-center rounded-full bg-selected font-medium text-foreground", classes)}
    >
      {name[0]?.toUpperCase() || "U"}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { collapsed, animate, toggle } = useSidebarLayout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);
  const materiaId = materiaIdFromPath(pathname);
  const materias = useMaterias(materiaId ?? pathname, materiaId);
  const seccionHrefs = useSeccionHrefs(materiaId);
  const activeKind = materiaId ? tabKindFromPath(materiaId, pathname) : null;

  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
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

  const profileName = session?.user?.name?.trim() || "Cuenta";
  const profileEmail = session?.user?.email || "Sesión activa";
  const profileImage =
    typeof session?.user?.image === "string" && session.user.image.trim() ? session.user.image : null;

  const accountItems: MenuItem[] = [
    { label: "Ver perfil", onSelect: () => router.push("/perfil") },
    {
      label: "Cerrar sesión",
      onSelect: () => {
        void authClient.signOut().then(() => {
          router.push("/login");
          router.refresh();
        });
      },
    },
  ];

  const inicioActive = pathname === "/";
  const calendarioActive = pathname === rutas.calendarioGlobal || pathname.startsWith(`${rutas.calendarioGlobal}/`);
  const nuevaActive = pathname === rutas.nuevaMateria;

  const expanded = (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 pl-5 pr-3 lg:h-12 lg:pl-4 lg:pr-2.5">
        <Link href={rutas.inicio} className="truncate font-serif text-xl leading-none tracking-tight">
          Arquímedes
        </Link>
        <IconButton
          icon="panel"
          label="Contraer barra"
          size={28}
          onClick={toggle}
          className="max-lg:hidden"
        />
        <IconButton
          icon="x"
          label="Cerrar menú"
          size={40}
          onClick={() => setDrawerOpen(false)}
          className="-mr-1 lg:hidden"
        />
      </div>

      <nav aria-label="Principal" className="flex min-h-0 flex-1 flex-col px-2.5">
        <div className="space-y-0.5">
          <NavRow href={rutas.inicio} icon="home" label="Inicio" active={inicioActive} />
          <NavRow href={rutas.calendarioGlobal} icon="calendario" label="Calendario" active={calendarioActive} />
        </div>

        <div className="mt-6 flex h-7 items-center justify-between pl-2.5">
          <span className="t-meta">Materias</span>
          <Tooltip label="Nueva materia">
            <Link
              href={rutas.nuevaMateria}
              aria-label="Nueva materia"
              aria-current={nuevaActive ? "page" : undefined}
              className={cx(
                "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors duration-(--dur-fast) ease-(--ease-out) pointer-coarse:h-10 pointer-coarse:w-10",
                rowTone(nuevaActive)
              )}
            >
              <Icon name="plus" size={16} />
            </Link>
          </Tooltip>
        </div>

        <div className="-mx-2.5 mt-1 min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
          {materias !== null && materias.length === 0 ? (
            <NavRow href={rutas.nuevaMateria} icon="plus" label="Crear materia" active={false} />
          ) : (
            <ul className="space-y-0.5">
              {(materias ?? []).map((materia) => {
                const active = materia.id === materiaId;
                return (
                  <li key={materia.id}>
                    <Link
                      href={rutas.materia(materia.id)}
                      title={materia.name}
                      className={cx(
                        ROW,
                        active
                          ? "font-medium text-foreground hover:bg-hover"
                          : "text-foreground-muted hover:bg-hover hover:text-foreground"
                      )}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        <ToneDot id={materia.id} />
                      </span>
                      <span className="truncate">{materia.name}</span>
                    </Link>
                    {active && (
                      <div className="mt-0.5 space-y-0.5 pl-3">
                        {SECCIONES.map((seccion, index) => (
                          <NavRow
                            key={seccion.label}
                            href={seccionHrefs[index] ?? seccion.base(materia.id)}
                            icon={seccion.icon}
                            label={seccion.label}
                            active={activeKind !== null && seccion.kinds.includes(activeKind)}
                          />
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      <div className="shrink-0 border-t border-border-subtle p-2.5">
        <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
          <Avatar name={profileName} image={profileImage} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium leading-[18px]" title={profileName}>
              {profileName}
            </div>
            <div className="truncate text-xs leading-4 text-foreground-subtle" title={profileEmail}>
              {profileEmail}
            </div>
          </div>
          <Menu
            label="Cuenta"
            placement="bottom-end"
            width={200}
            items={accountItems}
            trigger={(props) => <IconButton icon="more" label="Abrir menú de cuenta" size={28} {...props} />}
          />
        </div>
      </div>
    </>
  );

  const rail = (
    <>
      <div className="flex shrink-0 flex-col items-center gap-1 pt-2.5">
        <IconButton icon="panel" label="Expandir barra" size={28} tooltipSide="right" onClick={toggle} />
        <RailLink href={rutas.inicio} label="Arquímedes">
          <span className="font-serif text-xl leading-none">A</span>
        </RailLink>
        <RailLink href={rutas.inicio} label="Inicio" active={inicioActive}>
          <Icon name="home" size={16} />
        </RailLink>
        <RailLink href={rutas.calendarioGlobal} label="Calendario" active={calendarioActive}>
          <Icon name="calendario" size={16} />
        </RailLink>
        <div aria-hidden="true" className="my-1.5 h-px w-6 bg-border-subtle" />
      </div>
      <nav aria-label="Materias" className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto pb-3">
        {(materias ?? []).map((materia) => {
          const active = materia.id === materiaId;
          return (
            <div key={materia.id} className="flex flex-col items-center gap-1">
              <Tooltip label={materia.name} side="right">
                <Link
                  href={rutas.materia(materia.id)}
                  aria-label={materia.name}
                  className={cx(
                    "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[11px] transition-colors duration-(--dur-fast) ease-(--ease-out)",
                    active ? "bg-selected text-foreground" : "bg-hover text-foreground-muted hover:bg-selected hover:text-foreground"
                  )}
                >
                  {iniciales(materia.name)}
                  <ToneDot id={materia.id} className="absolute right-0.5 top-0.5" />
                </Link>
              </Tooltip>
              {active &&
                SECCIONES.map((seccion, index) => (
                  <RailLink
                    key={seccion.label}
                    href={seccionHrefs[index] ?? seccion.base(materia.id)}
                    label={seccion.label}
                    size={32}
                    active={activeKind !== null && seccion.kinds.includes(activeKind)}
                  >
                    <Icon name={seccion.icon} size={16} />
                  </RailLink>
                ))}
            </div>
          );
        })}
        <RailLink href={rutas.nuevaMateria} label="Nueva materia" size={32} active={nuevaActive}>
          <Icon name="plus" size={16} />
        </RailLink>
      </nav>
      <div className="flex shrink-0 justify-center border-t border-border-subtle py-2.5">
        <Menu
          label="Cuenta"
          placement="right-start"
          width={200}
          items={accountItems}
          trigger={(props) => (
            <Tooltip label={profileName} side="right">
              <button
                type="button"
                aria-label="Abrir menú de cuenta"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover"
                {...props}
              >
                <Avatar name={profileName} image={profileImage} size={28} />
              </button>
            </Tooltip>
          )}
        />
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-background/95 px-4 backdrop-blur lg:hidden">
        <Link href={rutas.inicio} className="font-serif text-xl tracking-tight">
          Arquímedes
        </Link>
        <IconButton
          icon="menu"
          label="Abrir menú"
          size={40}
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="app-sidebar"
          className="-mr-2"
        />
      </header>
      {drawerOpen && (
        <div
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
          className="t-fade-in fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}
      <aside
        id="app-sidebar"
        aria-label="Barra lateral"
        className={cx(
          "fixed bottom-0 left-0 top-0 z-50 flex w-[260px] max-w-[85vw] flex-col border-r border-border-subtle bg-background duration-(--dur-pop) ease-(--ease-out) motion-reduce:transition-none lg:z-auto lg:max-w-none lg:translate-x-0",
          animate ? "transition-[translate,width]" : "transition-[translate]",
          collapsed ? "lg:w-14" : "lg:w-[208px]",
          drawerOpen ? "translate-x-0" : "-translate-x-full max-lg:invisible"
        )}
      >
        <div className={cx("flex min-h-0 flex-1 flex-col", collapsed && "lg:hidden")}>{expanded}</div>
        <div className={cx("hidden min-h-0 flex-1 flex-col", collapsed && "lg:flex")}>{rail}</div>
      </aside>
    </>
  );
}
