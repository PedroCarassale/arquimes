import { useCallback, useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  closeTab,
  isDocumentKind,
  markSeen as markSeenTab,
  moveTab,
  openPath,
  setTabTitle,
  tabKey,
  tabKindFromPath,
  type Tab,
  type TabKind,
} from "@/lib/tabs";
import { rutas } from "@/lib/routes";

export type Reciente = {
  materiaId: string;
  materiaName: string;
  href: string;
  title: string;
  kind: TabKind;
  at: number;
};

const VERSION = 1;
const EVENT = "arq-tabs";
const RECENT_KEY = "arq.recent";
const MAX_RECENT = 20;
const MAX_CLOSED = 10;
const EMPTY: Tab[] = [];
const EMPTY_RECENT: Reciente[] = [];

const tabsCache = new Map<string, { raw: string | null; tabs: Tab[] }>();
let recentCache: { raw: string | null; items: Reciente[] } | null = null;
const memoryStorage = new Map<string, string | null>();
const lastActive = new Map<string, string>();
const closedStack = new Map<string, string[]>();
const knownTitles = new Map<string, { title: string; icon?: string }>();
const materiaNames = new Map<string, string>();
const discarded = new Map<string, number>();
const closingActive = new Map<string, string>();
const DISCARD_MS = 10_000;

function storageKey(materiaId: string) {
  return `arq.tabs.${materiaId}`;
}

function readRaw(key: string): string | null {
  if (memoryStorage.has(key)) return memoryStorage.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, raw: string | null) {
  try {
    if (raw === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, raw);
    memoryStorage.delete(key);
  } catch {
    memoryStorage.set(key, raw);
  }
}

function emit() {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTabs(materiaId: string, raw: string | null): Tab[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.v !== VERSION || !Array.isArray(data.tabs)) return EMPTY;
    const seen = new Set<string>();
    const tabs: Tab[] = [];
    for (const entry of data.tabs) {
      if (!isRecord(entry) || typeof entry.href !== "string") continue;
      const kind = tabKindFromPath(materiaId, entry.href);
      const key = tabKey(entry.href);
      if (!kind || kind === "inicio" || seen.has(key)) continue;
      seen.add(key);
      const tab: Tab = {
        href: entry.href,
        title: typeof entry.title === "string" ? entry.title : "",
        kind,
        at: typeof entry.at === "number" ? entry.at : 0,
      };
      if (entry.unread === true) tab.unread = true;
      if (typeof entry.icon === "string") tab.icon = entry.icon;
      tabs.push(tab);
    }
    return tabs.length ? tabs : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(materiaId: string): Tab[] {
  const raw = readRaw(storageKey(materiaId));
  const cached = tabsCache.get(materiaId);
  if (cached && cached.raw === raw) return cached.tabs;
  const tabs = parseTabs(materiaId, raw);
  tabsCache.set(materiaId, { raw, tabs });
  return tabs;
}

function writeTabs(materiaId: string, tabs: Tab[]) {
  if (tabs === getSnapshot(materiaId)) return;
  const raw = JSON.stringify({ v: VERSION, tabs });
  writeRaw(storageKey(materiaId), raw);
  tabsCache.set(materiaId, { raw, tabs });
  emit();
}

function parseRecent(raw: string | null): Reciente[] {
  if (!raw) return EMPTY_RECENT;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.v !== VERSION || !Array.isArray(data.items)) return EMPTY_RECENT;
    const items: Reciente[] = [];
    for (const entry of data.items) {
      if (!isRecord(entry) || typeof entry.materiaId !== "string" || typeof entry.href !== "string") continue;
      const kind = tabKindFromPath(entry.materiaId, entry.href);
      if (!kind || !isDocumentKind(kind)) continue;
      items.push({
        materiaId: entry.materiaId,
        materiaName: typeof entry.materiaName === "string" ? entry.materiaName : "",
        href: entry.href,
        title: typeof entry.title === "string" ? entry.title : "",
        kind,
        at: typeof entry.at === "number" ? entry.at : 0,
      });
    }
    return items.length ? items : EMPTY_RECENT;
  } catch {
    return EMPTY_RECENT;
  }
}

function getRecentSnapshot(): Reciente[] {
  const raw = readRaw(RECENT_KEY);
  if (recentCache && recentCache.raw === raw) return recentCache.items;
  const items = parseRecent(raw);
  recentCache = { raw, items };
  return items;
}

function writeRecent(items: Reciente[]) {
  if (items === getRecentSnapshot()) return;
  const raw = JSON.stringify({ v: VERSION, items });
  writeRaw(RECENT_KEY, raw);
  recentCache = { raw, items };
  emit();
}

function titleKey(materiaId: string, key: string) {
  return `${materiaId}|${key}`;
}

function touchRecent(materiaId: string, href: string, kind: TabKind, title: string, now: number) {
  const key = tabKey(href);
  const items = getRecentSnapshot();
  const previous = items.find((item) => item.materiaId === materiaId && tabKey(item.href) === key);
  const entry: Reciente = {
    materiaId,
    materiaName: materiaNames.get(materiaId) ?? previous?.materiaName ?? "",
    href,
    title: title || previous?.title || "",
    kind,
    at: now,
  };
  const rest = items.filter((item) => item !== previous);
  writeRecent([entry, ...rest].slice(0, MAX_RECENT));
}

function renameRecent(materiaId: string, key: string, title: string) {
  const items = getRecentSnapshot();
  const index = items.findIndex((item) => item.materiaId === materiaId && tabKey(item.href) === key);
  if (index < 0) {
    const kind = tabKindFromPath(materiaId, key);
    if (kind && isDocumentKind(kind) && lastActive.get(materiaId) === key) touchRecent(materiaId, key, kind, title, Date.now());
    return;
  }
  if (items[index].title === title) return;
  writeRecent(items.map((item, i) => (i === index ? { ...item, title } : item)));
}

function dropRecent(materiaId: string, keys: Set<string>) {
  const items = getRecentSnapshot();
  const kept = items.filter((item) => !(item.materiaId === materiaId && keys.has(tabKey(item.href))));
  if (kept.length !== items.length) writeRecent(kept.length ? kept : EMPTY_RECENT);
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export const tabsStore = {
  subscribe,
  getSnapshot,
  getServerSnapshot(): Tab[] {
    return EMPTY;
  },
  open(materiaId: string, href: string, opts?: { background?: boolean; title?: string; materiaName?: string }) {
    const kind = tabKindFromPath(materiaId, href);
    if (!kind) return;
    if (opts?.materiaName) materiaNames.set(materiaId, opts.materiaName);
    const background = Boolean(opts?.background);
    const key = tabKey(href);
    const now = Date.now();
    const discardedUntil = discarded.get(titleKey(materiaId, key));
    if (discardedUntil !== undefined) {
      if (discardedUntil > now) return;
      discarded.delete(titleKey(materiaId, key));
    }
    if (!background) closingActive.delete(materiaId);
    const known = knownTitles.get(titleKey(materiaId, key));
    let next = openPath(getSnapshot(materiaId), href, {
      materiaId,
      prevActiveKey: lastActive.get(materiaId) ?? null,
      now,
      background,
      title: opts?.title,
    });
    if (known && !opts?.title) next = setTabTitle(next, key, known.title, known.icon);
    if (!background) lastActive.set(materiaId, key);
    writeTabs(materiaId, next);
    if (!background && isDocumentKind(kind)) {
      const tab = next.find((item) => tabKey(item.href) === key);
      touchRecent(materiaId, href, kind, tab?.title ?? "", now);
    }
  },
  close(materiaId: string, key: string, activeKey: string | null, opts?: { deleted?: boolean }): string | null {
    const tabs = getSnapshot(materiaId);
    const closing = tabs.find((tab) => tabKey(tab.href) === key);
    const result = closeTab(tabs, key, activeKey, materiaId);
    const stack = (closedStack.get(materiaId) ?? []).filter((href) => tabKey(href) !== key);
    if (closing && !opts?.deleted) closedStack.set(materiaId, [...stack, closing.href].slice(-MAX_CLOSED));
    else closedStack.set(materiaId, stack);
    if (result.next) {
      lastActive.set(materiaId, tabKey(result.next));
      if (key === activeKey) closingActive.set(materiaId, key);
    }
    if (opts?.deleted) {
      knownTitles.delete(titleKey(materiaId, key));
      dropRecent(materiaId, new Set([key]));
    }
    writeTabs(materiaId, result.tabs);
    return result.next;
  },
  isClosing(materiaId: string, key: string): boolean {
    return closingActive.get(materiaId) === key;
  },
  forgetRecents(materiaId: string, keys: Iterable<string>) {
    dropRecent(materiaId, new Set(keys));
  },
  setTitle(materiaId: string, key: string, title: string, icon?: string) {
    knownTitles.set(titleKey(materiaId, key), { title, icon });
    writeTabs(materiaId, setTabTitle(getSnapshot(materiaId), key, title, icon));
    const kind = tabKindFromPath(materiaId, key);
    if (kind && isDocumentKind(kind) && title) renameRecent(materiaId, key, title);
  },
  markSeen(materiaId: string, key: string) {
    writeTabs(materiaId, markSeenTab(getSnapshot(materiaId), key));
  },
  move(materiaId: string, key: string, toIndex: number) {
    writeTabs(materiaId, moveTab(getSnapshot(materiaId), key, toIndex));
  },
  discard(materiaId: string, key: string): string | null {
    discarded.set(titleKey(materiaId, key), Date.now() + DISCARD_MS);
    const tabs = getSnapshot(materiaId);
    const result = closeTab(tabs, key, key, materiaId);
    if (result.next) {
      lastActive.set(materiaId, tabKey(result.next));
      closingActive.set(materiaId, key);
    }
    writeTabs(materiaId, result.tabs);
    dropRecent(materiaId, new Set([key]));
    return result.next;
  },
  popClosed(materiaId: string): string | null {
    const stack = closedStack.get(materiaId);
    const href = stack?.pop() ?? null;
    return href;
  },
};

export function forgetTabs(materiaId: string): void {
  writeRaw(storageKey(materiaId), null);
  tabsCache.delete(materiaId);
  lastActive.delete(materiaId);
  closedStack.delete(materiaId);
  closingActive.delete(materiaId);
  materiaNames.delete(materiaId);
  for (const key of Array.from(knownTitles.keys())) {
    if (key.startsWith(`${materiaId}|`)) knownTitles.delete(key);
  }
  const items = getRecentSnapshot();
  const kept = items.filter((item) => item.materiaId !== materiaId);
  if (kept.length !== items.length) writeRecent(kept.length ? kept : EMPTY_RECENT);
  emit();
}

function materiaIdFrom(pathname: string): string {
  const match = pathname.match(/^\/materias\/([^/]+)/);
  if (!match) throw new Error("useTabs fuera de una materia");
  return match[1];
}

export function useTabs(): {
  tabs: Tab[];
  activeKey: string;
  close(href: string, opts?: { deleted?: boolean }): void;
  openNueva(): void;
  openInBackground(href: string, title?: string): void;
} {
  const pathname = usePathname();
  const router = useRouter();
  const materiaId = materiaIdFrom(pathname);
  const tabs = useSyncExternalStore(
    tabsStore.subscribe,
    () => tabsStore.getSnapshot(materiaId),
    tabsStore.getServerSnapshot
  );
  const activeKey = tabKey(pathname);

  const close = useCallback(
    (href: string, opts?: { deleted?: boolean }) => {
      const next = tabsStore.close(materiaId, tabKey(href), activeKey, opts);
      if (next) router.replace(next);
    },
    [materiaId, activeKey, router]
  );

  const openNueva = useCallback(() => router.push(rutas.nueva(materiaId)), [materiaId, router]);

  const openInBackground = useCallback(
    (href: string, title?: string) => tabsStore.open(materiaId, href, { background: true, title }),
    [materiaId]
  );

  return useMemo(
    () => ({ tabs, activeKey, close, openNueva, openInBackground }),
    [tabs, activeKey, close, openNueva, openInBackground]
  );
}

export function useRecientes(materiaId?: string): Reciente[] {
  const items = useSyncExternalStore(subscribe, getRecentSnapshot, () => EMPTY_RECENT);
  return useMemo(
    () => (materiaId ? items.filter((item) => item.materiaId === materiaId) : items),
    [items, materiaId]
  );
}
