"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api";
import { fechaCorta, fechaLarga } from "@/lib/fechas";
import { crearNota } from "@/lib/notas-client";
import { rutas } from "@/lib/routes";
import { tabKey } from "@/lib/tabs";
import type { ApunteItem, EventoResumen, MateriaIndice } from "@/lib/types";
import { enqueueUploads } from "@/lib/upload-queue";
import { cx } from "@/components/ui/cx";
import { Icon, apunteIconName, type IconName } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { toast } from "@/components/ui/Toast";
import { useIsClient } from "@/components/ui/useIsClient";
import { eventoIconName, iconoPorKind, normalizeSearch, tabKindLabel } from "./TabBar";
import { useWorkspace } from "./WorkspaceContext";
import { tabsStore, useRecientes } from "./tabs-store";

type Mode = "tab" | "overlay";

type Action = { type: "navigate"; href: string } | { type: "nueva-clase" } | { type: "subir" } | { type: "chat"; text: string };

type Item = {
  id: string;
  section: string;
  label: string;
  icon: IconName;
  hint?: string;
  action: Action;
};

const MAX_RECENTS = 8;
const MAX_MATCHES = 6;

function apunteHint(item: ApunteItem): string {
  if (item.origen === "generado") return "Del chat";
  if (item.esExamen) return "Examen";
  const icon = apunteIconName(item);
  if (icon === "pdf") return "PDF";
  if (icon === "imagen") return "Imagen";
  if (icon === "texto") return "Texto";
  if (icon === "video") return "Video";
  return "Archivo";
}

function eventoHaystack(evento: EventoResumen): string {
  const parts = [evento.name];
  if (evento.date) {
    const [year, month, day] = evento.date.split("-");
    parts.push(evento.date, `${Number(day)}/${Number(month)}`, `${day}/${month}/${year}`);
    const corta = fechaCorta(evento.date);
    const larga = fechaLarga(evento.date);
    if (corta) parts.push(corta);
    if (larga) parts.push(larga);
  }
  return normalizeSearch(parts.join(" "));
}

function buildItems(
  materiaId: string,
  query: string,
  indice: MateriaIndice | null,
  recientes: ReturnType<typeof useRecientes>
): Item[] {
  const crear: Item[] = [
    { id: "crear-clase", section: "Crear", label: "Nueva clase", icon: "clase", action: { type: "nueva-clase" } },
    { id: "crear-archivo", section: "Crear", label: "Subir archivo", icon: "upload", action: { type: "subir" } },
    {
      id: "crear-evento",
      section: "Crear",
      label: "Cargar examen o entrega",
      icon: "calendario",
      action: { type: "navigate", href: rutas.calendario(materiaId, { nuevo: true }) },
    },
  ];
  const irA: Item[] = [
    { id: "ir-clases", section: "Ir a", label: "Clases", icon: "clase", action: { type: "navigate", href: rutas.clases(materiaId) } },
    { id: "ir-apuntes", section: "Ir a", label: "Apuntes", icon: "apunte", action: { type: "navigate", href: rutas.apuntes(materiaId) } },
    {
      id: "ir-calendario",
      section: "Ir a",
      label: "Calendario",
      icon: "calendario",
      action: { type: "navigate", href: rutas.calendario(materiaId) },
    },
  ];

  const text = query.trim();
  const needle = normalizeSearch(text);

  if (!needle) {
    const recents: Item[] = recientes.slice(0, MAX_RECENTS).map((item) => ({
      id: `reciente-${item.href}`,
      section: "Recientes",
      label: item.title || tabKindLabel(item.kind),
      icon: iconoPorKind(item.kind),
      hint: tabKindLabel(item.kind),
      action: { type: "navigate", href: item.href },
    }));
    return [...crear, ...irA, ...recents];
  }

  const matches = (label: string) => normalizeSearch(label).includes(needle);
  const clases: Item[] = (indice?.clases ?? [])
    .filter((clase) => matches(clase.titulo || "Sin título"))
    .slice(0, MAX_MATCHES)
    .map((clase) => ({
      id: `clase-${clase.id}`,
      section: "Clases",
      label: clase.titulo || "Sin título",
      icon: "clase",
      hint: "Clase",
      action: { type: "navigate", href: rutas.clase(materiaId, clase.id) },
    }));
  const apuntes: Item[] = (indice?.apuntes ?? [])
    .filter((apunte) => matches(apunte.origen === "archivo" ? apunte.name : apunte.titulo))
    .slice(0, MAX_MATCHES)
    .map((apunte) => ({
      id: `apunte-${apunte.origen}-${apunte.id}`,
      section: "Apuntes",
      label: apunte.origen === "archivo" ? apunte.name : apunte.titulo,
      icon: apunteIconName(apunte),
      hint: apunteHint(apunte),
      action: {
        type: "navigate",
        href: apunte.origen === "archivo" ? rutas.archivo(materiaId, apunte.id) : rutas.generado(materiaId, apunte.id),
      },
    }));
  const eventos: Item[] = (indice?.eventos ?? [])
    .filter((evento) => eventoHaystack(evento).includes(needle))
    .slice(0, MAX_MATCHES)
    .map((evento) => ({
      id: `evento-${evento.id}`,
      section: "Fechas",
      label: evento.name,
      icon: eventoIconName(evento),
      hint: fechaCorta(evento.date) ?? "Sin fecha",
      action: { type: "navigate", href: rutas.evento(materiaId, evento.id) },
    }));
  const acciones = [...crear, ...irA].filter((item) => matches(item.label));
  return [
    ...acciones,
    ...clases,
    ...apuntes,
    ...eventos,
    {
      id: "chat",
      section: "Chat",
      label: `Preguntarle al chat: «${text}»`,
      icon: "chat",
      action: { type: "chat", text },
    },
  ];
}

export function Launcher({ mode, onClose }: { mode: Mode; onClose?: () => void }) {
  const { materiaId, askChat } = useWorkspace();
  const router = useRouter();
  const recientes = useRecientes(materiaId);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [indice, setIndice] = useState<MateriaIndice | null>(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fetchedAt = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    let cancelled = false;
    fetchedAt.current = Date.now();
    apiFetch(`/api/materias/${materiaId}/indice`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: MateriaIndice | null) => {
        if (!cancelled && data && Array.isArray(data.clases)) setIndice(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [materiaId]);

  useEffect(() => {
    if (!indice) return;
    const vivos = new Set<string>([
      ...indice.clases.map((clase) => tabKey(rutas.clase(materiaId, clase.id))),
      ...indice.apuntes.map((apunte) =>
        tabKey(apunte.origen === "archivo" ? rutas.archivo(materiaId, apunte.id) : rutas.generado(materiaId, apunte.id))
      ),
      ...indice.eventos.map((evento) => tabKey(rutas.evento(materiaId, evento.id))),
    ]);
    const muertos = recientes
      .filter((item) => item.at < fetchedAt.current && !vivos.has(tabKey(item.href)))
      .map((item) => tabKey(item.href));
    if (muertos.length > 0) tabsStore.forgetRecents(materiaId, muertos);
  }, [indice, recientes, materiaId]);

  const items = buildItems(materiaId, query, indice, recientes);
  const active = Math.min(selected, items.length - 1);
  const activeItem = items[active];

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function navigate(href: string) {
    if (mode === "tab") router.replace(href);
    else router.push(href);
    onClose?.();
  }

  async function nuevaClase() {
    if (creating) return;
    setCreating(true);
    try {
      const nota = await crearNota(materiaId, { titulo: "" });
      navigate(rutas.clase(materiaId, nota.id));
    } catch (error) {
      setCreating(false);
      toast({ message: error instanceof Error ? error.message : "No se pudo crear la clase.", tone: "error" });
    }
  }

  function run(item: Item) {
    const { action } = item;
    if (action.type === "navigate") navigate(action.href);
    else if (action.type === "nueva-clase") void nuevaClase();
    else if (action.type === "subir") fileRef.current?.click();
    else {
      askChat(action.text, { send: true });
      onClose?.();
    }
  }

  function onFiles(files: File[]) {
    if (files.length === 0) return;
    enqueueUploads(materiaId, files, { kind: "apuntes" });
    navigate(rutas.apuntes(materiaId));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (items.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((active + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((active - 1 + items.length) % items.length);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (activeItem) run(activeItem);
    }
  }

  return (
    <div className={cx("flex min-h-0 flex-col", mode === "overlay" && "max-h-[min(560px,70vh)]")}>
      <div className="relative shrink-0">
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-subtle"
        />
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeItem ? `${listId}-${active}` : undefined}
          aria-label="Buscar en la materia"
          placeholder="Buscá una clase, un apunte o una fecha…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          onKeyDown={onKeyDown}
          className="h-11 w-full rounded-md border border-border-subtle bg-surface pl-10 pr-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-foreground-subtle hover:border-border"
        />
      </div>
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Resultados"
        className="-mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1 pb-1"
      >
        {items.map((item, index) => {
          const header = item.section !== "Chat" && (index === 0 || items[index - 1].section !== item.section);
          const isActive = index === active;
          return (
            <div key={item.id}>
              {header && <div className="t-meta px-2.5 pb-1 pt-3">{item.section}</div>}
              {item.section === "Chat" && index > 0 && <div className="mx-2.5 my-2 h-px bg-border-subtle" />}
              <button
                type="button"
                role="option"
                id={`${listId}-${index}`}
                aria-selected={isActive}
                data-index={index}
                tabIndex={-1}
                onMouseMove={() => {
                  if (!isActive) setSelected(index);
                }}
                onClick={() => run(item)}
                className={cx(
                  "flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm transition-colors duration-(--dur-fast) ease-(--ease-out) focus-visible:shadow-none pointer-coarse:h-11",
                  isActive ? "bg-selected text-foreground" : "text-foreground-muted"
                )}
              >
                <Icon name={item.icon} size={16} className={isActive ? "text-foreground" : "text-foreground-subtle"} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {creating && item.action.type === "nueva-clase" && (
                  <span className="font-mono text-[11px] text-foreground-subtle">Creando…</span>
                )}
                {item.hint && <span className="shrink-0 font-mono text-[11px] text-foreground-subtle">{item.hint}</span>}
                {isActive && <Kbd>↵</Kbd>}
              </button>
            </div>
          );
        })}
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          onFiles(files);
        }}
      />
    </div>
  );
}

export function LauncherOverlay({
  open,
  onClose,
  returnFocus,
}: {
  open: boolean;
  onClose: () => void;
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const isClient = useIsClient();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = returnFocus?.current ?? (focused?.closest("[data-arq-launcher]") ? null : focused);
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, returnFocus]);

  if (!open || !isClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-start justify-center px-2 pt-[15vh] sm:px-4">
      <div aria-hidden="true" onClick={onClose} className="t-fade-in fixed inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar o crear"
        data-arq-launcher=""
        className="t-pop-in relative w-full max-w-[600px] rounded-xl border border-white/[0.08] bg-surface-overlay p-3 shadow-pop"
      >
        <Launcher mode="overlay" onClose={onClose} />
      </div>
    </div>,
    document.body
  );
}
