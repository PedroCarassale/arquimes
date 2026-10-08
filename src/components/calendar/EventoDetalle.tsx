"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { MarkdownEditor } from "@/components/editor";
import {
  Button,
  ConfirmDialog,
  Icon,
  IconButton,
  Input,
  Menu,
  Popover,
  cx,
  fileIconName,
  toast,
  type IconName,
} from "@/components/ui";
import { TabLink } from "@/components/workspace/TabLink";
import { FocusRegister, useWorkspace } from "@/components/workspace/WorkspaceContext";
import { useTabs } from "@/components/workspace/tabs-store";
import { apiFetch } from "@/lib/api";
import { EVALUACION_ERRORES } from "@/lib/evaluacion-input";
import { evaluacionNombre } from "@/lib/evaluaciones";
import { cuentaRegresiva, fechaLarga, formatHora, hoyYmd } from "@/lib/fechas";
import { rutas } from "@/lib/routes";
import type { EvaluacionKind, Evento, ExamType, Tema } from "@/lib/types";
import { isYmd, kindIcon, normalizeHora, tipoPill } from "./eventos";
import { TemasChips } from "./TemasChips";
import { TipoChips } from "./TipoChips";

type Estado = "idle" | "guardando" | "guardado" | "desvanecido" | "error";
type Campo = "fecha" | "hora" | "tipo";
type TextoBody = { name?: string; description?: string };
type CamposBody = { kind?: EvaluacionKind; type?: ExamType | ""; date?: string; hora?: string };

const JSON_HEADERS = { "Content-Type": "application/json" };
const KEEPALIVE_MAX_BYTES = 60_000;
const SECTION = "t-meta mb-2";

function MetaButton({
  onClick,
  muted,
  children,
}: {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-sm px-1 transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover hover:text-foreground",
        muted && "text-foreground-subtle"
      )}
    >
      {children}
    </button>
  );
}

function FechaForm({
  value,
  onSubmit,
  onClear,
}: {
  value: string;
  onSubmit: (value: string) => void;
  onClear: () => void;
}) {
  const [fecha, setFecha] = useState(value || hoyYmd());
  return (
    <form
      className="space-y-3 p-3"
      noValidate
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isYmd(fecha)) onSubmit(fecha);
      }}
    >
      <Input
        type="date"
        autoFocus
        aria-label="Fecha"
        value={fecha}
        onChange={(event) => setFecha(event.target.value)}
        className="[color-scheme:dark]"
      />
      <div className="flex items-center gap-2">
        {value && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Quitar fecha
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" className="ml-auto" disabled={!isYmd(fecha)}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

function HoraForm({
  value,
  onSubmit,
  onClear,
}: {
  value: string;
  onSubmit: (value: string) => void;
  onClear: () => void;
}) {
  const [hora, setHora] = useState(value);
  const [error, setError] = useState(false);
  return (
    <form
      className="space-y-3 p-3"
      noValidate
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normal = normalizeHora(hora);
        if (normal === null) {
          setError(true);
          return;
        }
        if (normal === "") onClear();
        else onSubmit(normal);
      }}
    >
      <Input
        autoFocus
        aria-label="Hora"
        value={hora}
        invalid={error}
        onChange={(event) => {
          setHora(event.target.value);
          setError(false);
        }}
        placeholder="HH:MM"
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        className="w-[88px] font-mono"
      />
      {error && (
        <p role="alert" className="text-[13px] leading-5 text-danger">
          {EVALUACION_ERRORES.hora}
        </p>
      )}
      <div className="flex items-center gap-2">
        {value && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Quitar hora
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" className="ml-auto">
          Guardar
        </Button>
      </div>
    </form>
  );
}

export function EventoDetalle({ evento, temas: temasIniciales }: { evento: Evento; temas: Tema[] }) {
  const pathname = usePathname();
  const { materiaId, askChat } = useWorkspace();
  const { close } = useTabs();
  const url = `/api/examenes/${evento.id}`;
  const nombreInicial = evaluacionNombre(evento);
  const descripcionInicial = evento.description ?? evento.objective ?? "";

  const [name, setName] = useState(nombreInicial);
  const [kind, setKind] = useState<EvaluacionKind>(evento.kind ?? "examen");
  const [type, setType] = useState<ExamType | undefined>(
    !evento.kind || evento.kind === "examen" ? evento.type : undefined
  );
  const [date, setDate] = useState(evento.date ?? "");
  const [hora, setHora] = useState(evento.hora ?? "");
  const [temas, setTemas] = useState(temasIniciales);
  const [estado, setEstado] = useState<Estado>("idle");
  const [editing, setEditing] = useState<{ campo: Campo; anchor: HTMLElement } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ name: nombreInicial, description: descripcionInicial });
  const lastSaved = useRef({ name: nombreInicial, description: descripcionInicial });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const deleted = useRef(false);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const pendingBody = useCallback((): TextoBody | null => {
    if (deleted.current) return null;
    const body: TextoBody = {};
    const nombre = latest.current.name.trim();
    if (nombre && nombre !== lastSaved.current.name) body.name = nombre;
    if (latest.current.description !== lastSaved.current.description) body.description = latest.current.description;
    return body.name !== undefined || body.description !== undefined ? body : null;
  }, []);

  const commit = useCallback((body: TextoBody) => {
    lastSaved.current = {
      name: body.name ?? lastSaved.current.name,
      description: body.description ?? lastSaved.current.description,
    };
  }, []);

  const clearFade = useCallback(() => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = null;
  }, []);

  const markSaved = useCallback(() => {
    setEstado("guardado");
    clearFade();
    fadeTimer.current = setTimeout(
      () => setEstado((current) => (current === "guardado" ? "desvanecido" : current)),
      2000
    );
  }, [clearFade]);

  const save = useCallback(
    (explicit = false) => {
      clearTimer();
      queue.current = queue.current.then(async () => {
        const body = pendingBody();
        if (!body) {
          if (explicit && !deleted.current) markSaved();
          return;
        }
        setEstado("guardando");
        try {
          const response = await apiFetch(url, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(body) });
          if (!response.ok) throw new Error();
          commit(body);
          markSaved();
        } catch {
          setEstado("error");
        }
      });
      return queue.current;
    },
    [clearTimer, pendingBody, commit, markSaved, url]
  );

  const schedule = useCallback(() => {
    clearTimer();
    timer.current = setTimeout(() => void save(), 800);
  }, [clearTimer, save]);

  const patchCampos = useCallback(
    (body: CamposBody, revert: () => void) => {
      queue.current = queue.current.then(async () => {
        setEstado("guardando");
        try {
          const response = await apiFetch(url, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(body) });
          if (!response.ok) throw new Error();
          markSaved();
        } catch {
          revert();
          setEstado("idle");
          toast({ message: "No se pudo guardar", tone: "error" });
        }
      });
    },
    [markSaved, url]
  );

  useEffect(() => {
    function flush(keepalive: boolean) {
      clearTimer();
      const body = pendingBody();
      if (!body) return;
      const json = JSON.stringify(body);
      commit(body);
      const small = new Blob([json]).size < KEEPALIVE_MAX_BYTES;
      void fetch(url, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: json,
        credentials: "include",
        keepalive: keepalive && small,
      }).catch(() => {});
    }
    const onPageHide = () => flush(true);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      flush(false);
    };
  }, [url, clearTimer, pendingBody, commit]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  useEffect(() => clearFade, [clearFade]);

  function abrir(campo: Campo, event: MouseEvent<HTMLElement>) {
    setEditing({ campo, anchor: event.currentTarget });
  }

  function cambiarFecha(next: string) {
    const previous = date;
    setEditing(null);
    if (next === previous) return;
    setDate(next);
    patchCampos({ date: next }, () => setDate(previous));
  }

  function cambiarHora(next: string) {
    const previous = hora;
    setEditing(null);
    if (next === previous) return;
    setHora(next);
    patchCampos({ hora: next }, () => setHora(previous));
  }

  function cambiarTipo(nextKind: EvaluacionKind, nextType: ExamType | undefined) {
    const previous = { kind, type };
    setKind(nextKind);
    setType(nextType);
    patchCampos({ kind: nextKind, type: nextKind === "examen" ? nextType ?? "" : "" }, () => {
      setKind(previous.kind);
      setType(previous.type);
    });
  }

  async function agregarTemas(names: string[]): Promise<boolean> {
    for (const tema of names) {
      try {
        const response = await apiFetch(`${url}/temas`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ name: tema }),
        });
        const payload = (await response.json().catch(() => ({}))) as Partial<Tema> & { error?: string };
        if (!response.ok || !payload.id) throw new Error(payload.error);
        setTemas((current) => [...current, payload as Tema]);
      } catch (err) {
        toast({
          message: err instanceof Error && err.message ? err.message : "No se pudo agregar el tema",
          tone: "error",
        });
        return false;
      }
    }
    return true;
  }

  async function quitarTema(tema: Tema) {
    setTemas((current) => current.filter((item) => item.id !== tema.id));
    try {
      const response = await apiFetch(`/api/temas/${tema.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
    } catch {
      setTemas((current) =>
        current.some((item) => item.id === tema.id)
          ? current
          : [...current, tema].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      );
      toast({ message: "No se pudo quitar el tema", tone: "error" });
    }
  }

  async function borrar() {
    deleted.current = true;
    clearTimer();
    try {
      const response = await apiFetch(url, { method: "DELETE" });
      if (!response.ok) throw new Error();
    } catch {
      deleted.current = false;
      toast({ message: "No se pudo borrar", tone: "error" });
      return;
    }
    setConfirmOpen(false);
    close(pathname);
  }

  const titulo = name.trim() || nombreInicial || "Evento";
  const fecha = fechaLarga(date || undefined);
  const horaTexto = formatHora(hora || undefined);
  const cuenta = cuentaRegresiva(date || undefined);
  const nombreChat = name.trim() || nombreInicial;
  const temasTexto = temas.map((tema) => tema.name).join(", ");
  const conTemas = temasTexto ? ` con estos temas: ${temasTexto}` : "";
  const guia = { label: "Haceme una guía de estudio", icon: "generado" as IconName, texto: `Haceme una guía de estudio para «${nombreChat}»${conTemas}.` };
  const acciones =
    kind === "entrega"
      ? [
          {
            label: "Armame un plan para la entrega",
            icon: "entrega" as IconName,
            texto: `Armame un plan para la entrega «${nombreChat}»${fecha ? ` del ${fecha}` : ""}.`,
          },
          guia,
        ]
      : kind === "evento"
        ? [guia]
        : [{ label: "Armame un simulacro", icon: "examen" as IconName, texto: `Armame un simulacro de «${nombreChat}»${conTemas}.` }, guia];

  const estadoTexto = estado === "guardando" ? "Guardando…" : estado === "idle" ? "" : "Guardado";
  const estadoVisible = estado === "guardando" || estado === "guardado";

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-6 md:px-8 md:pt-10">
      <FocusRegister kind="examen" id={evento.id} titulo={titulo} icon={kindIcon(kind)} />

      <div className="mb-4 flex min-h-8 items-center gap-2">
        <button
          type="button"
          onClick={(event) => abrir("tipo", event)}
          aria-label={`Tipo: ${tipoPill(kind, type)}. Cambiar`}
          className="inline-flex h-6 items-center gap-1.5 rounded-full bg-hover px-2.5 font-mono text-[11px] uppercase tracking-[0.06em] text-foreground-muted transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-selected hover:text-foreground pointer-coarse:min-h-10"
        >
          <Icon name={kindIcon(kind)} size={12} />
          {tipoPill(kind, type)}
        </button>
        <div className="ml-auto flex items-center gap-1">
          {estado === "error" ? (
            <span role="status" className="font-mono text-[11px] text-danger">
              No se pudo guardar ·{" "}
              <button type="button" onClick={() => void save(true)} className="underline underline-offset-2 hover:text-foreground">
                Reintentar
              </button>
            </span>
          ) : (
            <span
              role="status"
              className={cx(
                "font-mono text-[11px] text-foreground-subtle transition-opacity duration-300",
                estadoVisible ? "opacity-100" : "opacity-0"
              )}
            >
              {estadoTexto}
            </span>
          )}
          <Menu
            label="Más acciones"
            trigger={(props) => <IconButton icon="more" label="Más acciones" size={28} {...props} />}
            items={[{ label: "Borrar", icon: "trash", danger: true, onSelect: () => setConfirmOpen(true) }]}
          />
        </div>
      </div>

      <input
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          latest.current.name = event.target.value;
          schedule();
        }}
        onBlur={() => {
          if (!latest.current.name.trim()) {
            setName(lastSaved.current.name);
            latest.current.name = lastSaved.current.name;
            return;
          }
          void save();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          wrapRef.current?.querySelector<HTMLElement>(".ProseMirror, textarea")?.focus();
        }}
        aria-label="Nombre del evento"
        placeholder="Sin nombre"
        maxLength={200}
        className="t-doc-title w-full bg-transparent text-foreground outline-none placeholder:text-foreground-subtle focus-visible:shadow-none"
      />

      <div className="mt-2 flex flex-wrap items-center gap-x-0.5 text-sm leading-6 text-foreground-muted">
        <MetaButton onClick={(event) => abrir("fecha", event)} muted={!fecha}>
          {fecha ?? "Agregar fecha"}
        </MetaButton>
        <span aria-hidden="true">·</span>
        <MetaButton onClick={(event) => abrir("hora", event)} muted={!horaTexto}>
          {horaTexto ?? "Agregar hora"}
        </MetaButton>
        {cuenta && (
          <>
            <span aria-hidden="true">·</span>
            <span className="px-1">{cuenta}</span>
          </>
        )}
      </div>

      <section className="mt-8" aria-label="Temas">
        <h2 className={SECTION}>Temas</h2>
        <TemasChips temas={temas} onAdd={agregarTemas} onRemove={(tema) => void quitarTema(tema)} />
      </section>

      <section className="mt-6" aria-label="Con el chat">
        <div className="flex flex-wrap gap-2">
          {acciones.map((accion) => (
            <Button
              key={accion.label}
              variant="secondary"
              size="sm"
              icon={accion.icon}
              onClick={() => askChat(accion.texto, { send: true })}
            >
              {accion.label}
            </Button>
          ))}
        </div>
      </section>

      {evento.materialId && (
        <section className="mt-8" aria-label="Archivo del examen">
          <h2 className={SECTION}>Archivo del examen</h2>
          <TabLink
            href={rutas.archivo(materiaId, evento.materialId)}
            className="flex h-11 max-w-full items-center gap-3 rounded-md px-2 transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-hover text-foreground-muted">
              <Icon name={fileIconName(evento.fileType ?? "", evento.fileName ?? "")} size={16} />
            </span>
            <span className="min-w-0 truncate text-sm text-foreground">{evento.fileName || "Archivo"}</span>
          </TabLink>
        </section>
      )}

      <section className="mt-10 border-t border-border-subtle pt-6" aria-label="Descripción">
        <h2 className={SECTION}>Descripción</h2>
        <div ref={wrapRef}>
          <MarkdownEditor
            key={evento.id}
            value={descripcionInicial}
            onChange={(markdown) => {
              latest.current.description = markdown;
              schedule();
            }}
            placeholder="Anotá qué entra, qué dijo el profe, links…"
            onAskSelection={(texto) =>
              askChat(`Explicame esto de «${nombreChat}»:\n\n${texto}`, { send: true })
            }
          />
        </div>
      </section>

      <Popover
        open={editing?.campo === "fecha"}
        onClose={() => setEditing(null)}
        anchor={editing?.anchor ?? null}
        width={260}
        title="Fecha"
      >
        <FechaForm value={date} onSubmit={cambiarFecha} onClear={() => cambiarFecha("")} />
      </Popover>
      <Popover
        open={editing?.campo === "hora"}
        onClose={() => setEditing(null)}
        anchor={editing?.anchor ?? null}
        width={220}
        title="Hora"
      >
        <HoraForm value={hora} onSubmit={cambiarHora} onClear={() => cambiarHora("")} />
      </Popover>
      <Popover
        open={editing?.campo === "tipo"}
        onClose={() => setEditing(null)}
        anchor={editing?.anchor ?? null}
        width={300}
        title="Tipo"
      >
        <div className="p-3">
          <TipoChips kind={kind} type={type} onChange={cambiarTipo} />
        </div>
      </Popover>

      <ConfirmDialog
        open={confirmOpen}
        title={`¿Borrar «${titulo}»?`}
        body="No se puede deshacer."
        onConfirm={borrar}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
