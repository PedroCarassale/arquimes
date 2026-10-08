"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { cx } from "@/components/ui/cx";
import { useRememberMateria } from "@/lib/materia-snapshot";
import { rutas } from "@/lib/routes";
import { tabKey } from "@/lib/tabs";
import { ChatPanel } from "./ChatPanel";
import { LauncherOverlay } from "./Launcher";
import { TabBar } from "./TabBar";
import { WorkspaceProvider, useChatLayout, useWorkspace } from "./WorkspaceContext";
import { tabsStore } from "./tabs-store";

const WIDTH_KEY = "arq.chat.width";
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 320;
const MAX_WIDTH = 560;
const MIN_CONTENT = 560;
const KEY_STEP = 16;

const OVERLAY =
  "fixed inset-0 z-40 flex flex-col bg-background md:absolute md:right-auto md:w-[380px] md:max-w-full md:border-r md:border-border-subtle md:shadow-pop";
const COLUMN =
  "lg:relative lg:inset-auto lg:z-auto lg:flex lg:w-[var(--chat-w)] lg:max-w-none lg:shrink-0 lg:flex-col lg:border-r lg:border-border-subtle lg:bg-background lg:shadow-none";

function clampWidth(value: number, rowWidth?: number) {
  const max = rowWidth ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, rowWidth - MIN_CONTENT)) : MAX_WIDTH;
  return Math.round(Math.min(max, Math.max(MIN_WIDTH, value)));
}

export function MateriaWorkspace({
  materiaId,
  materiaName,
  materiaInfo,
  children,
}: {
  materiaId: string;
  materiaName: string;
  materiaInfo?: string;
  children: React.ReactNode;
}) {
  useRememberMateria(materiaId, materiaInfo ? { name: materiaName, info: materiaInfo } : { name: materiaName });
  return (
    <AppShell>
      <WorkspaceProvider key={materiaId} materiaId={materiaId} materiaName={materiaName}>
        <WorkspaceFrame>{children}</WorkspaceFrame>
      </WorkspaceProvider>
    </AppShell>
  );
}

function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const { materiaId, chatOpen, mobileChatOpen, openChat, closeChat } = useWorkspace();
  const { reportColumnFits, closeOverlay, isChatVisible } = useChatLayout();
  const router = useRouter();
  const pathname = usePathname();
  const rowRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const width = useRef(DEFAULT_WIDTH);
  const separatorRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const [fits, setFits] = useState(true);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const launcherReturn = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WIDTH_KEY);
      const stored = raw === null || raw === "" ? Number.NaN : Number(raw);
      if (Number.isFinite(stored)) {
        width.current = clampWidth(stored);
        asideRef.current?.style.setProperty("--chat-w", `${width.current}px`);
        separatorRef.current?.setAttribute("aria-valuenow", String(width.current));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver((entries) => {
      const rowWidth = entries[entries.length - 1]?.contentRect.width ?? row.getBoundingClientRect().width;
      const next = rowWidth - width.current >= MIN_CONTENT;
      reportColumnFits(next);
      setFits(next);
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, [reportColumnFits]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && !event.altKey && !event.shiftKey && key === "k") {
        event.preventDefault();
        const focused = document.activeElement;
        if (focused instanceof HTMLElement && !focused.closest("[data-arq-launcher]")) {
          launcherReturn.current = focused === document.body ? null : focused;
        }
        setLauncherOpen(true);
        return;
      }
      if (mod && !event.altKey && !event.shiftKey && key === "j") {
        event.preventDefault();
        if (isChatVisible()) closeChat();
        else openChat({ focusComposer: true });
        return;
      }
      if (event.key === "Escape" && !mod && mobileChatOpen && !isChatVisibleAsColumn()) {
        closeOverlay();
        return;
      }
      if (!event.altKey || mod) return;
      if (!event.shiftKey && /^Digit[1-9]$/.test(event.code)) {
        event.preventDefault();
        const index = Number(event.code.slice(5));
        if (index === 1) {
          router.push(rutas.materia(materiaId));
        } else {
          const tab = tabsStore.getSnapshot(materiaId)[index - 2];
          if (tab) router.push(tab.href);
        }
        return;
      }
      if (!event.shiftKey && event.code === "KeyW") {
        event.preventDefault();
        const active = tabKey(pathname);
        const next = tabsStore.close(materiaId, active, active);
        if (next) router.replace(next);
        return;
      }
      if (event.shiftKey && event.code === "KeyT") {
        event.preventDefault();
        const href = tabsStore.popClosed(materiaId);
        if (href) router.push(href);
      }
    }

    function isChatVisibleAsColumn() {
      return window.matchMedia("(min-width: 1024px)").matches && fits && chatOpen;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [materiaId, pathname, router, isChatVisible, openChat, closeChat, closeOverlay, mobileChatOpen, fits, chatOpen]);

  const syncSeparator = useCallback((node: HTMLDivElement | null) => {
    separatorRef.current = node;
    node?.setAttribute("aria-valuenow", String(width.current));
  }, []);

  const applyWidth = useCallback((next: number) => {
    width.current = next;
    asideRef.current?.style.setProperty("--chat-w", `${next}px`);
    separatorRef.current?.setAttribute("aria-valuenow", String(next));
  }, []);

  const persistWidth = useCallback(() => {
    try {
      window.localStorage.setItem(WIDTH_KEY, String(width.current));
    } catch {}
  }, []);

  const startDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const aside = asideRef.current;
      const row = rowRef.current;
      if (!aside || !row) return;
      applyWidth(clampWidth(event.clientX - aside.getBoundingClientRect().left, row.getBoundingClientRect().width));
    },
    [applyWidth]
  );

  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    persistWidth();
  }, [persistWidth]);

  const onSeparatorKey = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? KEY_STEP : -KEY_STEP;
      applyWidth(clampWidth(width.current + delta, rowRef.current?.getBoundingClientRect().width));
      persistWidth();
    },
    [applyWidth, persistWidth]
  );

  const lgColumn = chatOpen && fits;
  const asideClass = lgColumn ? cx(mobileChatOpen ? OVERLAY : "hidden", COLUMN) : mobileChatOpen ? OVERLAY : "hidden";

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] min-h-[480px] flex-col lg:h-dvh">
      <div ref={rowRef} className="relative flex min-h-0 flex-1">
        {mobileChatOpen && (
          <div
            aria-hidden="true"
            onClick={closeOverlay}
            className={cx("t-fade-in absolute inset-0 z-30 hidden bg-black/40 md:block", lgColumn && "lg:hidden")}
          />
        )}
        <aside
          ref={asideRef}
          style={{ "--chat-w": `${DEFAULT_WIDTH}px` } as React.CSSProperties}
          className={asideClass}
          aria-label="Chat de estudio"
        >
          <ChatPanel />
          {lgColumn && (
            <div
              role="separator"
              tabIndex={0}
              aria-orientation="vertical"
              aria-label="Cambiar ancho del chat"
              aria-valuemin={MIN_WIDTH}
              aria-valuemax={MAX_WIDTH}
              ref={syncSeparator}
              onPointerDown={startDrag}
              onPointerMove={onDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={onSeparatorKey}
              className="absolute inset-y-0 -right-1 z-10 hidden w-2 cursor-col-resize transition-colors duration-(--dur-fast) hover:bg-border lg:block"
            />
          )}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={<div aria-hidden="true" className="h-11 shrink-0 border-b border-border-subtle md:h-10" />}>
            <TabBar columnChat={lgColumn} />
          </Suspense>
          <div data-arq-workspace-content="" className="relative min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
      <LauncherOverlay open={launcherOpen} onClose={() => setLauncherOpen(false)} returnFocus={launcherReturn} />
    </div>
  );
}
