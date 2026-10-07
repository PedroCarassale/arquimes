"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { useRememberMateria } from "@/lib/materia-snapshot";
import { ChatPanel } from "./ChatPanel";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceContext";

const SECTIONS = [
  { href: "", label: "Inicio" },
  { href: "/notas", label: "Notas" },
  { href: "/examenes", label: "Exámenes" },
  { href: "/generados", label: "Generados" },
  { href: "/apuntes", label: "Material" },
];

const WIDTH_KEY = "arq.chat.width";
const MIN_WIDTH = 320;
const MAX_WIDTH = 680;

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
  const { materiaId, materiaName, chatOpen, mobileChatOpen, toggleChat } = useWorkspace();
  const pathname = usePathname();
  const base = `/materias/${materiaId}`;
  const asideRef = useRef<HTMLElement>(null);
  const width = useRef(420);
  const dragging = useRef(false);

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(WIDTH_KEY));
      if (stored >= MIN_WIDTH && stored <= MAX_WIDTH) {
        width.current = stored;
        asideRef.current?.style.setProperty("--chat-w", `${stored}px`);
      }
    } catch {}
  }, []);

  const startDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const aside = event.currentTarget.parentElement;
    if (!aside) return;
    const next = Math.round(
      Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX - aside.getBoundingClientRect().left))
    );
    width.current = next;
    aside.style.setProperty("--chat-w", `${next}px`);
  }, []);

  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      window.localStorage.setItem(WIDTH_KEY, String(width.current));
    } catch {}
  }, []);

  const isActive = (href: string) =>
    href === "" ? pathname === base || pathname === `${base}/` : pathname.startsWith(`${base}${href}`) ||
      (href === "/apuntes" && (pathname.startsWith(`${base}/materiales`) || pathname.startsWith(`${base}/cargar`)));

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-[480px] flex-col lg:h-screen">
      <header className="shrink-0 border-b border-border-subtle">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
          <ChatToggle open={chatOpen} onClick={toggleChat} className="hidden lg:flex" />
          <ChatToggle open={mobileChatOpen} onClick={toggleChat} className="flex lg:hidden" />
          <div className="min-w-0 flex-1">
            <Link
              href="/"
              className="block font-mono text-[10px] uppercase tracking-wider text-foreground-muted hover:text-foreground"
            >
              Materias /
            </Link>
            <h1 className="truncate font-serif text-xl leading-tight">{materiaName}</h1>
          </div>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Secciones de la materia">
            {SECTIONS.map((section) => (
              <SectionLink key={section.label} href={`${base}${section.href}`} active={isActive(section.href)}>
                {section.label}
              </SectionLink>
            ))}
          </nav>
        </div>
        <nav
          className="-mt-1 flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] md:hidden"
          aria-label="Secciones de la materia"
        >
          {SECTIONS.map((section) => (
            <SectionLink key={section.label} href={`${base}${section.href}`} active={isActive(section.href)}>
              {section.label}
            </SectionLink>
          ))}
        </nav>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside
          ref={asideRef}
          style={{ "--chat-w": "420px" } as React.CSSProperties}
          className={`relative min-h-0 flex-col border-border-subtle bg-background lg:w-[var(--chat-w)] lg:shrink-0 lg:border-r ${
            mobileChatOpen ? "max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:flex" : "max-lg:hidden"
          } ${chatOpen ? "lg:flex" : "lg:hidden"}`}
          aria-label="Chat de estudio"
        >
          <ChatPanel />
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Cambiar ancho del chat"
            onPointerDown={startDrag}
            onPointerMove={onDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="absolute inset-y-0 -right-1 z-10 hidden w-2 cursor-col-resize hover:bg-accent/20 lg:block"
          />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function ChatToggle({
  open,
  onClick,
  className,
}: {
  open: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={open}
      aria-label={open ? "Cerrar chat" : "Abrir chat"}
      title={open ? "Cerrar chat" : "Abrir chat"}
      className={`${className} h-9 shrink-0 items-center gap-2 border px-2.5 text-xs font-mono uppercase tracking-wider transition-colors ${
        open
          ? "border-accent/60 text-accent"
          : "border-border text-foreground-muted hover:border-accent hover:text-foreground"
      }`}
    >
      <PanelIcon />
      <span className="hidden sm:inline">Chat</span>
    </button>
  );
}

function SectionLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-surface-elevated text-foreground shadow-[inset_0_-2px_0_var(--accent)]"
          : "text-foreground-muted hover:bg-surface hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function PanelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 4.5v15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
