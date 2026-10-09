"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";
import { defaultTitle, isDocumentKind, openPath, tabKey, tabKindFromPath, type Tab, type TabKind } from "@/lib/tabs";
import { rutas } from "@/lib/routes";
import type { EventoResumen, MateriaIndice } from "@/lib/types";
import { cx } from "@/components/ui/cx";
import { Icon, apunteIconName, isIconName, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Popover } from "@/components/ui/Popover";
import { Sheet } from "@/components/ui/Sheet";
import { Tooltip } from "@/components/ui/Tooltip";
import { useIsClient } from "@/components/ui/useIsClient";
import { useWorkspace } from "./WorkspaceContext";
import { tabsStore } from "./tabs-store";

const KIND_ICON: Record<TabKind, IconName> = {
  inicio: "home",
  nueva: "plus",
  clases: "clase",
  clase: "clase",
  apuntes: "apunte",
  archivo: "apunte",
  generado: "generado",
  calendario: "calendario",
  evento: "evento",
};

const TAB_MIN = 120;
const TAB_GAP = 2;
const OVERFLOW_HYSTERESIS = 4;
const EDGE_FADE = 24;

const KIND_LABEL: Record<TabKind, string> = {
  inicio: "Inicio",
  nueva: "Nueva",
  clases: "Clases",
  clase: "Clase",
  apuntes: "Apuntes",
  archivo: "Archivo",
  generado: "Pergamino",
  calendario: "Calendario",
  evento: "Evento",
};

export function iconoPorKind(kind: TabKind): IconName {
  return KIND_ICON[kind];
}

export function tabIcon(tab: Pick<Tab, "kind" | "icon">): IconName {
  return isIconName(tab.icon) ? tab.icon : KIND_ICON[tab.kind];
}

export function tabTitle(tab: Pick<Tab, "kind" | "title">): string {
  return tab.title || defaultTitle(tab.kind);
}

export function tabKindLabel(kind: TabKind): string {
  return KIND_LABEL[kind];
}

const DIACRITICS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");

export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

function onMiddleMouseDown(event: React.MouseEvent) {
  if (event.button === 1) event.preventDefault();
}

export function eventoIconName(evento: Pick<EventoResumen, "kind">): IconName {
  if (evento.kind === "entrega") return "entrega";
  if (evento.kind === "evento") return "evento";
  return "examen";
}

const titleAttempts = new Set<string>();

function needsTitle(tab: Tab): boolean {
  return isDocumentKind(tab.kind) && tab.title === defaultTitle(tab.kind);
}

function useResolveTitles(materiaId: string, tabs: Tab[]) {
  const pending = tabs
    .filter((tab) => needsTitle(tab) && !titleAttempts.has(`${materiaId}|${tabKey(tab.href)}`))
    .map((tab) => tabKey(tab.href))
    .join(" ");

  useEffect(() => {
    if (!pending) return;
    const keys = pending.split(" ");
    for (const key of keys) titleAttempts.add(`${materiaId}|${key}`);
    apiFetch(`/api/materias/${materiaId}/indice`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: MateriaIndice | null) => {
        if (!data || !Array.isArray(data.clases)) return;
        const found = new Map<string, { title: string; icon?: IconName }>();
        for (const clase of data.clases) {
          found.set(tabKey(rutas.clase(materiaId, clase.id)), { title: clase.titulo.trim() || "Sin título" });
        }
        for (const apunte of data.apuntes ?? []) {
          const href = apunte.origen === "archivo" ? rutas.archivo(materiaId, apunte.id) : rutas.generado(materiaId, apunte.id);
          const title = apunte.origen === "archivo" ? apunte.name : apunte.titulo;
          found.set(tabKey(href), { title, icon: apunteIconName(apunte) });
        }
        for (const evento of data.eventos ?? []) {
          found.set(tabKey(rutas.evento(materiaId, evento.id)), { title: evento.name, icon: eventoIconName(evento) });
        }
        const current = tabsStore.getSnapshot(materiaId);
        for (const key of keys) {
          const hit = found.get(key);
          const tab = current.find((item) => tabKey(item.href) === key);
          if (hit?.title && tab && needsTitle(tab)) tabsStore.setTitle(materiaId, key, hit.title, hit.icon);
        }
      })
      .catch(() => {});
  }, [materiaId, pending]);
}

export function TabBar({ columnChat }: { columnChat: boolean }) {
  const { materiaId, materiaName, openChat } = useWorkspace();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const search = searchParams.toString();
  const currentHref = search ? `${pathname}?${search}` : pathname;
  const stored = useSyncExternalStore(
    tabsStore.subscribe,
    () => tabsStore.getSnapshot(materiaId),
    tabsStore.getServerSnapshot
  );
  const activeKey = tabKey(pathname);
  const homeHref = rutas.materia(materiaId);
  const homeKey = tabKey(homeHref);
  const activeKind = tabKindFromPath(materiaId, pathname);
  const hydrated = useIsClient();

  const tabs = useMemo(() => {
    if (!activeKind || activeKind === "inicio") return stored;
    if (stored.some((tab) => tabKey(tab.href) === activeKey)) return stored;
    if (hydrated && tabsStore.isClosing(materiaId, activeKey)) return stored;
    return openPath(stored, currentHref, { materiaId, prevActiveKey: null, now: 0 });
  }, [stored, hydrated, activeKind, activeKey, currentHref, materiaId]);

  useResolveTitles(materiaId, stored);

  useEffect(() => {
    tabsStore.open(materiaId, currentHref, { materiaName });
    tabsStore.markSeen(materiaId, tabKey(currentHref));
  }, [materiaId, materiaName, currentHref]);

  const close = useCallback(
    (tab: Tab) => {
      const next = tabsStore.close(materiaId, tabKey(tab.href), activeKey);
      if (next) router.replace(next);
    },
    [materiaId, activeKey, router]
  );

  const openNueva = useCallback(() => router.push(rutas.nueva(materiaId)), [materiaId, router]);

  const activeTab = tabs.find((tab) => tabKey(tab.href) === activeKey);
  const activeTitle = activeKey === homeKey || !activeTab ? materiaName : tabTitle(activeTab);
  const activeIcon: IconName = activeKey === homeKey || !activeTab ? "home" : tabIcon(activeTab);

  return (
    <>
      <DesktopStrip
        tabs={tabs}
        activeKey={activeKey}
        homeHref={homeHref}
        homeActive={activeKey === homeKey}
        materiaName={materiaName}
        columnChat={columnChat}
        onOpenChat={() => openChat({ focusComposer: true })}
        onClose={close}
        onNueva={openNueva}
      />
      <MobileBar
        tabs={tabs}
        activeKey={activeKey}
        homeHref={homeHref}
        homeActive={activeKey === homeKey}
        materiaName={materiaName}
        nuevaHref={rutas.nueva(materiaId)}
        activeTitle={activeTitle}
        activeIcon={activeIcon}
        onOpenChat={() => openChat()}
        onClose={close}
      />
    </>
  );
}

type StripProps = {
  tabs: Tab[];
  activeKey: string;
  homeHref: string;
  homeActive: boolean;
  materiaName: string;
  onClose: (tab: Tab) => void;
};

function DesktopStrip({
  tabs,
  activeKey,
  homeHref,
  homeActive,
  materiaName,
  columnChat,
  onOpenChat,
  onClose,
  onNueva,
}: StripProps & { columnChat: boolean; onOpenChat: () => void; onNueva: () => void }) {
  const scrollRef = useRef<HTMLElement>(null);
  const countRef = useRef(tabs.length);
  const overflowRef = useRef(false);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    countRef.current = tabs.length;
  });

  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((current) => (current.left === left && current.right === right ? current : { left, right }));
    const count = countRef.current;
    const minContent = count * TAB_MIN + Math.max(0, count - 1) * TAB_GAP;
    const next = overflowRef.current
      ? minContent + OVERFLOW_HYSTERESIS > el.clientWidth
      : el.scrollWidth > el.clientWidth + 1;
    if (next !== overflowRef.current) {
      overflowRef.current = next;
      setOverflow(next);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => updateEdges());
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdges]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const el = scrollRef.current;
      updateEdges();
      const active = el?.querySelector<HTMLElement>(`[data-tab-key="${CSS.escape(activeKey)}"]`);
      if (!el || !active) return;
      const box = el.getBoundingClientRect();
      const pill = active.getBoundingClientRect();
      if (pill.left < box.left + EDGE_FADE) el.scrollLeft -= box.left + EDGE_FADE - pill.left;
      else if (pill.right > box.right - EDGE_FADE) el.scrollLeft += pill.right - (box.right - EDGE_FADE);
      updateEdges();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tabs, activeKey, overflow, updateEdges]);

  const plus = <IconButton icon="plus" label="Pestaña nueva" size={28} onClick={onNueva} className="shrink-0" />;

  return (
    <div
      data-arq-tabbar=""
      className="hidden h-10 shrink-0 items-center gap-0.5 border-b border-border-subtle bg-background px-2 md:flex"
    >
      <IconButton
        icon="panel"
        label="Abrir chat"
        shortcut="Ctrl J"
        size={28}
        onClick={onOpenChat}
        className={columnChat ? "lg:hidden" : undefined}
      />
      <Link
        href={homeHref}
        aria-current={homeActive ? "page" : undefined}
        data-tab-home=""
        className={cx(
          "flex h-7 max-w-[180px] shrink-0 items-center gap-1.5 rounded-sm px-2.5 transition-colors duration-(--dur-fast) ease-(--ease-out)",
          homeActive ? "bg-selected text-foreground" : "text-foreground-muted hover:bg-hover hover:text-foreground"
        )}
      >
        <Icon name="home" size={14} />
        <span className="truncate font-serif text-[15px] leading-5">{materiaName}</span>
      </Link>
      <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-border-subtle" />
      <div className="relative flex min-w-0 flex-1 items-center">
        <nav
          ref={scrollRef}
          aria-label="Pestañas"
          onScroll={updateEdges}
          onWheel={(event) => {
            const el = event.currentTarget;
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) el.scrollLeft += event.deltaY;
          }}
          className="t-no-scrollbar -my-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden py-1"
        >
          {tabs.map((tab) => (
            <TabPill key={tabKey(tab.href)} tab={tab} active={tabKey(tab.href) === activeKey} onClose={() => onClose(tab)} />
          ))}
          {!overflow && plus}
        </nav>
        {edges.left && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r from-background to-transparent" />
        )}
        {edges.right && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-background to-transparent" />
        )}
      </div>
      {overflow && plus}
      <OpenTabsMenu tabs={tabs} activeKey={activeKey} onClose={onClose} />
    </div>
  );
}

function TabPill({ tab, active, onClose }: { tab: Tab; active: boolean; onClose: () => void }) {
  const title = tabTitle(tab);
  return (
    <div
      data-tab-key={tabKey(tab.href)}
      data-active={active ? "" : undefined}
      className={cx(
        "group relative flex h-7 min-w-[120px] flex-[0_1_200px] items-center rounded-sm transition-colors duration-(--dur-fast) ease-(--ease-out) has-[>a:focus-visible]:shadow-[inset_0_0_0_2px_var(--ring)]",
        active ? "bg-selected text-foreground" : "text-foreground-muted hover:bg-hover hover:text-foreground"
      )}
    >
      <Link
        href={tab.href}
        aria-current={active ? "page" : undefined}
        title={title}
        onMouseDown={onMiddleMouseDown}
        onAuxClick={(event) => {
          if (event.button !== 1) return;
          event.preventDefault();
          onClose();
        }}
        className={cx(
          "flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-sm pl-2.5 text-[13px] leading-[18px] focus-visible:shadow-none",
          active ? "pr-7" : "pr-2.5 group-hover:pr-7 group-focus-within:pr-7"
        )}
      >
        <Icon name={tabIcon(tab)} size={14} />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {tab.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Sin ver" />}
      </Link>
      <Tooltip label="Cerrar pestaña" shortcut={active ? "Alt W" : undefined}>
        <button
          type="button"
          aria-label={`Cerrar ${title}`}
          onClick={onClose}
          className={cx(
            "absolute right-[5px] top-1/2 inline-flex h-[18px] w-[18px] -translate-y-1/2 items-center justify-center rounded-xs text-foreground-subtle transition-opacity hover:bg-hover hover:text-foreground focus-visible:opacity-100",
            active ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto"
          )}
        >
          <Icon name="x" size={12} />
        </button>
      </Tooltip>
    </div>
  );
}

function OpenTabsMenu({ tabs, activeKey, onClose }: { tabs: Tab[]; activeKey: string; onClose: (tab: Tab) => void }) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = normalizeSearch(query.trim());
    if (!needle) return tabs;
    return tabs.filter((tab) => normalizeSearch(tabTitle(tab)).includes(needle));
  }, [tabs, query]);

  return (
    <>
      <IconButton
        ref={setAnchor}
        icon="chevron-down"
        label="Pestañas abiertas"
        size={28}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setQuery("");
          setOpen((value) => !value);
        }}
      />
      <Popover open={open} onClose={() => setOpen(false)} anchor={anchor} placement="bottom-end" width={320} title="Pestañas abiertas">
        <div className="p-1">
          <div className="t-meta px-2 pb-1 pt-1.5">Pestañas abiertas</div>
          {tabs.length > 8 && (
            <div className="px-1 pb-1">
              <Input size="sm" autoFocus placeholder="Buscar pestaña" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          )}
          {visible.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-foreground-muted">
              {tabs.length === 0 ? "No hay otras pestañas abiertas." : "Ninguna pestaña coincide."}
            </p>
          ) : (
            <ul>
              {visible.map((tab) => {
                const key = tabKey(tab.href);
                const active = key === activeKey;
                return (
                  <li key={key} className={cx("group flex h-9 items-center rounded-md", active ? "bg-selected" : "hover:bg-hover")}>
                    <Link
                      href={tab.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-md pl-2 pr-1 text-[13px]"
                    >
                      <Icon name={tabIcon(tab)} size={14} className="text-foreground-muted" />
                      <span className="min-w-0 flex-1 truncate">{tabTitle(tab)}</span>
                      {tab.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Sin ver" />}
                      <span className="shrink-0 font-mono text-[11px] text-foreground-subtle">{tabKindLabel(tab.kind)}</span>
                    </Link>
                    <button
                      type="button"
                      aria-label={`Cerrar ${tabTitle(tab)}`}
                      onClick={() => onClose(tab)}
                      className="mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xs text-foreground-subtle hover:bg-hover hover:text-foreground"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Popover>
    </>
  );
}

function MobileBar({
  tabs,
  activeKey,
  homeHref,
  homeActive,
  materiaName,
  nuevaHref,
  activeTitle,
  activeIcon,
  onOpenChat,
  onClose,
}: StripProps & { nuevaHref: string; activeTitle: string; activeIcon: IconName; onOpenChat: () => void }) {
  const [open, setOpen] = useState(false);
  const count = tabs.length + 1;
  const rowClass = "flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-md px-3 text-sm";
  const nuevaKey = tabKey(nuevaHref);
  const nuevaTab = tabs.find((tab) => tabKey(tab.href) === nuevaKey);
  const nuevaActive = activeKey === nuevaKey;
  const listed = nuevaTab ? tabs.filter((tab) => tab !== nuevaTab) : tabs;

  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border-subtle bg-background px-2 md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Pestaña actual: ${activeTitle}. ${count} ${count === 1 ? "abierta" : "abiertas"}`}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-hover active:bg-pressed"
      >
        <Icon name={activeIcon} size={16} className="text-foreground-muted" />
        <span className={cx("min-w-0 truncate", homeActive ? "font-serif text-[17px]" : "text-sm")}>{activeTitle}</span>
        <Icon name="chevron-down" size={14} className="text-foreground-subtle" />
        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-hover px-1.5 font-mono text-[11px] text-foreground-muted">
          {count}
        </span>
      </button>
      <IconButton icon="chat" label="Chat" size={40} onClick={onOpenChat} />
      <Sheet open={open} onClose={() => setOpen(false)} title="Pestañas">
        <ul className="flex flex-col gap-0.5">
          <li className={cx("flex items-center rounded-md", nuevaActive && "bg-selected")}>
            <Link
              href={nuevaHref}
              onClick={() => setOpen(false)}
              aria-current={nuevaActive ? "page" : undefined}
              className={cx(rowClass, nuevaActive ? "text-foreground" : "text-foreground-muted hover:bg-hover")}
            >
              <Icon name="plus" size={16} />
              <span className="min-w-0 flex-1 truncate">Pestaña nueva</span>
            </Link>
            {nuevaTab && (
              <IconButton icon="x" label="Cerrar Pestaña nueva" size={40} onClick={() => onClose(nuevaTab)} />
            )}
          </li>
          <li className={cx("flex rounded-md", homeActive && "bg-selected")}>
            <Link href={homeHref} onClick={() => setOpen(false)} aria-current={homeActive ? "page" : undefined} className={rowClass}>
              <Icon name="home" size={16} className="text-foreground-muted" />
              <span className="min-w-0 flex-1 truncate font-serif text-[17px]">{materiaName}</span>
            </Link>
          </li>
          {listed.map((tab) => {
            const key = tabKey(tab.href);
            const active = key === activeKey;
            return (
              <li key={key} className={cx("flex items-center rounded-md", active && "bg-selected")}>
                <Link href={tab.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={rowClass}>
                  <Icon name={tabIcon(tab)} size={16} className="text-foreground-muted" />
                  <span className="min-w-0 flex-1 truncate">{tabTitle(tab)}</span>
                  {tab.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Sin ver" />}
                  <span className="shrink-0 font-mono text-[11px] text-foreground-subtle">{tabKindLabel(tab.kind)}</span>
                </Link>
                <IconButton icon="x" label={`Cerrar ${tabTitle(tab)}`} size={40} onClick={() => onClose(tab)} />
              </li>
            );
          })}
        </ul>
      </Sheet>
    </div>
  );
}
