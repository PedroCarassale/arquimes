"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { MarkdownEditor } from "@/components/editor";
import { ConfirmDialog, IconButton, Menu, cx, toast } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { fechaLarga } from "@/lib/fechas";
import { descargarMarkdown } from "@/lib/notas-client";
import type { Nota } from "@/lib/types";
import { FocusRegister, useWorkspace } from "./WorkspaceContext";
import { registerClaseEditor } from "./clase-editors";
import { useTabs } from "./tabs-store";

type Estado = "idle" | "guardando" | "guardado" | "oculto" | "error";
type Snapshot = { titulo: string; contenido: string };
type Local = { snapshot: Snapshot; updatedAt: string; pendiente?: number };

const DEBOUNCE_MS = 800;
const FADE_MS = 2000;
const KEEPALIVE_LIMIT = 60_000;
const SESION = "arq.clase.";
const locales = new Map<string, Local>();
const restauradas = new Set<string>();
let cadena: Promise<unknown> = Promise.resolve();
let secuencia = 0;
const sinSuscripcion = () => () => {};

function iguales(a: Snapshot, b: Snapshot): boolean {
  return a.titulo === b.titulo && a.contenido === b.contenido;
}

function sesion(notaId: string, local?: Local | null): Local | null {
  try {
    if (local === undefined) return JSON.parse(sessionStorage.getItem(SESION + notaId) ?? "null") as Local | null;
    if (local) sessionStorage.setItem(SESION + notaId, JSON.stringify(local));
    else sessionStorage.removeItem(SESION + notaId);
  } catch {}
  return null;
}

function conocida(notaId: string, updatedAt: string): string {
  const local = locales.get(notaId)?.updatedAt ?? "";
  return local > updatedAt ? local : updatedAt;
}

function recordarPendiente(notaId: string, snapshot: Snapshot, updatedAt: string) {
  const local = { snapshot, updatedAt: conocida(notaId, updatedAt), pendiente: secuencia };
  locales.set(notaId, local);
  sesion(notaId, local);
}

function restaurable(nota: Nota): boolean {
  if (restauradas.has(nota.id)) return true;
  if (locales.has(nota.id)) return false;
  const local = sesion(nota.id);
  if (!local || nota.updatedAt > local.updatedAt || iguales(local.snapshot, nota)) return false;
  restauradas.add(nota.id);
  return true;
}

async function enviar(notaId: string, snapshot: Snapshot, keepalive = false): Promise<string | null> {
  const orden = ++secuencia;
  try {
    const response = await apiFetch(`/api/notas/${notaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
      keepalive,
    });
    if (!response.ok) return null;
    const { updatedAt } = ((await response.json().catch(() => null)) ?? {}) as Partial<Nota>;
    if (typeof updatedAt !== "string") return "";
    const actual = locales.get(notaId);
    const anterior = actual?.pendiente !== undefined && orden <= actual.pendiente;
    const local = anterior ? { ...actual, updatedAt } : { snapshot, updatedAt };
    locales.set(notaId, local);
    if (sesion(notaId)) sesion(notaId, local);
    return updatedAt;
  } catch {
    return null;
  }
}

function avisarError(notaId: string, snapshot: Snapshot) {
  toast({
    message: "No se pudo guardar",
    tone: "error",
    action: {
      label: "Reintentar",
      onClick: () => {
        void enviar(notaId, snapshot).then((ok) => {
          if (ok !== null) toast({ message: "Guardado" });
          else avisarError(notaId, snapshot);
        });
      },
    },
  });
}

export function NotaEditor({ nota }: { nota: Nota }) {
  const restaurar = useSyncExternalStore(sinSuscripcion, () => restaurable(nota), () => false);
  return <Editor key={restaurar ? "local" : "servidor"} nota={nota} restaurar={restaurar} />;
}

function Editor({ nota, restaurar }: { nota: Nota; restaurar: boolean }) {
  const pathname = usePathname();
  const { askChat, bumpRefresh, materiaId } = useWorkspace();
  const { close, openInBackground } = useTabs();
  const router = useRouter();
  const [inicial] = useState(() => {
    const local = locales.get(nota.id) ?? (restaurar ? sesion(nota.id) : null);
    return local && nota.updatedAt <= local.updatedAt
      ? { ...local.snapshot, updatedAt: local.updatedAt }
      : { titulo: nota.titulo, contenido: nota.contenido, updatedAt: nota.updatedAt };
  });
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [contenido, setContenido] = useState(inicial.contenido);
  const [estado, setEstado] = useState<Estado>("idle");
  const [confirmando, setConfirmando] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Snapshot>({ titulo: inicial.titulo, contenido: inicial.contenido });
  const base = useRef(inicial.updatedAt);
  const lastSaved = useRef<Snapshot>({ titulo: nota.titulo, contenido: nota.contenido });
  const deleted = useRef(false);

  useLayoutEffect(() => {
    latest.current = { titulo, contenido };
  }, [titulo, contenido]);

  const save = useCallback((): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const run = cadena.then(async (): Promise<"noop" | "ok" | "error"> => {
      const snapshot = latest.current;
      if (deleted.current || iguales(snapshot, lastSaved.current)) return "noop";
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      setEstado("guardando");
      const updatedAt = await enviar(nota.id, snapshot);
      if (updatedAt === null) return "error";
      if (updatedAt) base.current = updatedAt;
      const antesVacio = !lastSaved.current.contenido.trim();
      lastSaved.current = snapshot;
      if (antesVacio !== !snapshot.contenido.trim()) bumpRefresh();
      return "ok";
    });
    cadena = run.catch(() => undefined);
    return run.then((result) => {
      if (result === "error") {
        setEstado("error");
        return false;
      }
      if (result === "ok") {
        if (iguales(latest.current, lastSaved.current)) {
          setEstado("guardado");
          fadeTimer.current = setTimeout(
            () => setEstado((actual) => (actual === "guardado" ? "oculto" : actual)),
            FADE_MS
          );
        } else {
          setEstado("idle");
        }
      }
      return true;
    });
  }, [nota.id, bumpRefresh]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), DEBOUNCE_MS);
  }, [save]);

  useEffect(() => {
    if (!iguales(latest.current, lastSaved.current)) schedule();
  }, [schedule]);

  useEffect(() => {
    const notaId = nota.id;
    const pending = timer;
    const fade = fadeTimer;
    const conocido = base;
    function flushOnExit() {
      const snapshot = latest.current;
      if (deleted.current || iguales(snapshot, lastSaved.current)) return;
      recordarPendiente(notaId, snapshot, conocido.current);
      const body = JSON.stringify(snapshot);
      void enviar(notaId, snapshot, new Blob([body]).size < KEEPALIVE_LIMIT);
      lastSaved.current = snapshot;
    }
    window.addEventListener("pagehide", flushOnExit);
    window.addEventListener("beforeunload", flushOnExit);
    return () => {
      window.removeEventListener("pagehide", flushOnExit);
      window.removeEventListener("beforeunload", flushOnExit);
      if (pending.current) clearTimeout(pending.current);
      if (fade.current) clearTimeout(fade.current);
      const snapshot = latest.current;
      if (deleted.current || iguales(snapshot, lastSaved.current)) return;
      recordarPendiente(notaId, snapshot, conocido.current);
      const envio = cadena
        .then(() => (iguales(snapshot, lastSaved.current) ? "" : enviar(notaId, snapshot)))
        .then((ok) => {
          if (ok !== null) lastSaved.current = snapshot;
          else avisarError(notaId, snapshot);
        });
      cadena = envio.catch(() => undefined);
    };
  }, [nota.id]);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  useLayoutEffect(() => {
    const el = tituloRef.current;
    if (!el) return;
    function ajustar() {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
    ajustar();
    let ancho = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === ancho) return;
      ancho = el.clientWidth;
      ajustar();
    });
    observer.observe(el);
    void document.fonts?.ready.then(ajustar);
    return () => observer.disconnect();
  }, [titulo]);

  function onTituloKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    wrapRef.current?.querySelector<HTMLElement>(".ProseMirror")?.focus();
  }

  const onContenido = useCallback(
    (markdown: string) => {
      latest.current = { ...latest.current, contenido: markdown };
      setContenido(markdown);
      schedule();
    },
    [schedule]
  );

  async function borrar() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const response = await apiFetch(`/api/notas/${nota.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      toast({ message: "No se pudo borrar la clase.", tone: "error" });
      if (!iguales(latest.current, lastSaved.current)) schedule();
      return;
    }
    deleted.current = true;
    locales.delete(nota.id);
    sesion(nota.id, null);
    setConfirmando(false);
    close(pathname, { deleted: true });
  }

  const nombre = titulo.trim() || "Sin título";
  const fecha = fechaLarga(nota.createdAt);

  return (
    <div className="mx-auto box-content max-w-[720px] px-4 pb-32 pt-6 md:px-8 md:pt-10">
      <FocusRegister kind="nota" id={nota.id} titulo={nombre} />
      <div className="flex h-8 items-center gap-3 md:pl-11">
        {fecha && <span className="font-mono text-[11px] leading-4 text-foreground-subtle">{fecha}</span>}
        <div className="ml-auto flex items-center gap-1">
          <EstadoGuardado estado={estado} onRetry={() => void save()} />
          <Menu
            label="Opciones de la clase"
            items={[
              {
                label: "Descargar .md",
                icon: "download",
                onSelect: () => descargarMarkdown(nombre, `# ${nombre}\n\n${latest.current.contenido}`),
              },
              { separator: true },
              { label: "Borrar", icon: "trash", danger: true, onSelect: () => setConfirmando(true) },
            ]}
            trigger={(props) => <IconButton icon="more" label="Más opciones" size={28} {...props} />}
          />
        </div>
      </div>

      <textarea
        ref={tituloRef}
        rows={1}
        value={titulo}
        onChange={(event) => {
          setTitulo(event.target.value.replace(/\s*[\r\n]+\s*/g, " "));
          schedule();
        }}
        onBlur={() => void save()}
        onKeyDown={onTituloKeyDown}
        aria-label="Título de la clase"
        placeholder="Sin título"
        spellCheck={false}
        className="t-doc-title mt-2 block w-full resize-none overflow-hidden bg-transparent p-0 text-foreground outline-none [overflow-wrap:break-word] placeholder:text-foreground-subtle focus-visible:shadow-none md:pl-11"
      />

      <div ref={wrapRef} className="mt-5">
        <MarkdownEditor
          key={nota.id}
          value={inicial.contenido}
          onChange={onContenido}
          autoFocus={inicial.contenido === ""}
          onAskSelection={(texto) => askChat(`Explicame esto de mi clase «${nombre}»:\n\n${texto}`, { send: true })}
          onReady={(editor) => registerClaseEditor(nota.id, editor)}
          apuntes={{
            materiaId,
            onOpen: (href, { background, title }) => (background ? openInBackground(href, title) : router.push(href)),
          }}
        />
      </div>

      <ConfirmDialog
        open={confirmando}
        title={`¿Borrar «${nombre}»?`}
        body="No se puede deshacer."
        onConfirm={borrar}
        onCancel={() => setConfirmando(false)}
      />
    </div>
  );
}

function EstadoGuardado({ estado, onRetry }: { estado: Estado; onRetry: () => void }) {
  if (estado === "error") {
    return (
      <span role="status" data-save-state="error" className="font-mono text-[11px] leading-4 text-danger">
        No se pudo guardar ·{" "}
        <button type="button" onClick={onRetry} className="rounded-xs underline underline-offset-2 hover:text-foreground">
          Reintentar
        </button>
      </span>
    );
  }
  return (
    <span
      role="status"
      aria-live="polite"
      data-save-state={estado}
      className={cx(
        "px-1 font-mono text-[11px] leading-4 text-foreground-subtle transition-opacity duration-500 ease-out motion-reduce:transition-none",
        estado === "oculto" || estado === "idle" ? "opacity-0" : "opacity-100"
      )}
    >
      {estado === "guardando" ? "Guardando…" : estado === "idle" ? "" : "Guardado"}
    </span>
  );
}
