import { rutas } from "./routes.ts";

export type TabKind =
  | "inicio"
  | "nueva"
  | "clases"
  | "clase"
  | "apuntes"
  | "archivo"
  | "generado"
  | "calendario"
  | "evento";

export type Tab = {
  href: string;
  title: string;
  kind: TabKind;
  at: number;
  unread?: boolean;
  icon?: string;
};

export const MAX_TABS = 30;

const DEFAULT_TITLES: Record<TabKind, string> = {
  inicio: "",
  nueva: "Pestaña nueva",
  clases: "Clases",
  clase: "Clase",
  apuntes: "Apuntes",
  archivo: "Archivo",
  generado: "Documento",
  calendario: "Calendario",
  evento: "Evento",
};

export function tabKey(href: string): string {
  let path = href;
  const hash = path.indexOf("#");
  if (hash >= 0) path = path.slice(0, hash);
  const query = path.indexOf("?");
  if (query >= 0) path = path.slice(0, query);
  while (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

export function tabKindFromPath(materiaId: string, pathname: string): TabKind | null {
  const key = tabKey(pathname);
  const base = rutas.materia(materiaId);
  if (key === base) return "inicio";
  if (!key.startsWith(`${base}/`)) return null;
  const parts = key.slice(base.length + 1).split("/");
  if (parts.some((part) => part === "")) return null;
  const [section, second, third] = parts;
  switch (parts.length) {
    case 1:
      if (section === "nueva") return "nueva";
      if (section === "clases") return "clases";
      if (section === "apuntes") return "apuntes";
      if (section === "calendario") return "calendario";
      return null;
    case 2:
      if (section === "clases") return "clase";
      if (section === "calendario") return "evento";
      return null;
    case 3:
      if (section === "apuntes" && second === "archivo" && third) return "archivo";
      if (section === "apuntes" && second === "generado" && third) return "generado";
      return null;
    default:
      return null;
  }
}

export function defaultTitle(kind: TabKind): string {
  return DEFAULT_TITLES[kind];
}

export function isDocumentKind(kind: TabKind): boolean {
  return kind === "clase" || kind === "archivo" || kind === "generado" || kind === "evento";
}

function indexOfKey(tabs: Tab[], key: string): number {
  return tabs.findIndex((tab) => tabKey(tab.href) === key);
}

function trim(tabs: Tab[], activeKey: string | null): Tab[] {
  let next = tabs;
  while (next.length > MAX_TABS) {
    let oldest = -1;
    for (let i = 0; i < next.length; i += 1) {
      if (tabKey(next[i].href) === activeKey) continue;
      if (oldest < 0 || next[i].at < next[oldest].at) oldest = i;
    }
    if (oldest < 0) break;
    next = [...next.slice(0, oldest), ...next.slice(oldest + 1)];
  }
  return next;
}

export function openPath(
  tabs: Tab[],
  href: string,
  opts: { materiaId: string; prevActiveKey: string | null; now: number; background?: boolean; title?: string }
): Tab[] {
  const kind = tabKindFromPath(opts.materiaId, href);
  if (!kind || kind === "inicio") return tabs;
  const key = tabKey(href);
  const background = Boolean(opts.background);
  const nuevaKey = tabKey(rutas.nueva(opts.materiaId));
  const replacingNueva = !background && opts.prevActiveKey === nuevaKey && key !== nuevaKey;
  const nuevaIndex = replacingNueva ? indexOfKey(tabs, nuevaKey) : -1;
  const existing = indexOfKey(tabs, key);
  const activeKey = background ? opts.prevActiveKey : key;

  if (existing >= 0) {
    const current = tabs[existing];
    const updated: Tab = { ...current, href };
    if (opts.title) updated.title = opts.title;
    if (!background) {
      updated.at = opts.now;
      delete updated.unread;
    }
    let next = tabs.map((tab, index) => (index === existing ? updated : tab));
    if (nuevaIndex >= 0) next = next.filter((_, index) => index !== nuevaIndex);
    return trim(next, activeKey);
  }

  const tab: Tab = { href, title: opts.title || defaultTitle(kind), kind, at: opts.now };
  if (background) tab.unread = true;

  if (nuevaIndex >= 0) {
    return trim(
      tabs.map((current, index) => (index === nuevaIndex ? tab : current)),
      activeKey
    );
  }

  const prevIndex = opts.prevActiveKey ? indexOfKey(tabs, opts.prevActiveKey) : -1;
  const next =
    prevIndex >= 0 ? [...tabs.slice(0, prevIndex + 1), tab, ...tabs.slice(prevIndex + 1)] : [...tabs, tab];
  return trim(next, activeKey);
}

export function closeTab(
  tabs: Tab[],
  key: string,
  activeKey: string | null,
  materiaId: string
): { tabs: Tab[]; next: string | null } {
  const home = rutas.materia(materiaId);
  if (key === tabKey(home)) return { tabs, next: null };
  const index = indexOfKey(tabs, key);
  const wasActive = key === activeKey;
  if (index < 0) return { tabs, next: wasActive ? home : null };
  const remaining = [...tabs.slice(0, index), ...tabs.slice(index + 1)];
  if (!wasActive) return { tabs: remaining, next: null };
  const neighbor = remaining[index] ?? remaining[index - 1];
  return { tabs: remaining, next: neighbor ? neighbor.href : home };
}

export function setTabTitle(tabs: Tab[], key: string, title: string, icon?: string): Tab[] {
  const index = indexOfKey(tabs, key);
  if (index < 0) return tabs;
  const current = tabs[index];
  const nextIcon = icon ?? current.icon;
  if (current.title === title && current.icon === nextIcon) return tabs;
  const updated: Tab = { ...current, title };
  if (nextIcon) updated.icon = nextIcon;
  return tabs.map((tab, i) => (i === index ? updated : tab));
}

export function markSeen(tabs: Tab[], key: string): Tab[] {
  const index = indexOfKey(tabs, key);
  if (index < 0 || !tabs[index].unread) return tabs;
  const updated: Tab = { ...tabs[index] };
  delete updated.unread;
  return tabs.map((tab, i) => (i === index ? updated : tab));
}

export function moveTab(tabs: Tab[], key: string, toIndex: number): Tab[] {
  const from = indexOfKey(tabs, key);
  if (from < 0) return tabs;
  const target = Math.max(0, Math.min(tabs.length - 1, Math.round(toIndex)));
  if (target === from) return tabs;
  const next = [...tabs];
  const [tab] = next.splice(from, 1);
  next.splice(target, 0, tab);
  return next;
}
