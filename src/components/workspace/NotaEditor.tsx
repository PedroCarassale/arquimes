"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { descargarMarkdown, relativo } from "@/lib/notas-client";
import type { Nota } from "@/lib/types";
import { FocusRegister, useWorkspace } from "./WorkspaceContext";

type Estado = "guardado" | "pendiente" | "guardando" | "error";

const FORMATOS: { label: string; title: string; apply: (sel: string) => [string, string, string] }[] = [
  { label: "B", title: "Negrita (Ctrl+B)", apply: (s) => ["**", s || "texto", "**"] },
  { label: "I", title: "Itálica (Ctrl+I)", apply: (s) => ["_", s || "texto", "_"] },
  { label: "H", title: "Título", apply: (s) => ["\n## ", s || "Título", "\n"] },
  { label: "•", title: "Lista", apply: (s) => ["\n- ", s || "", ""] },
  { label: "☐", title: "Tarea", apply: (s) => ["\n- [ ] ", s || "", ""] },
  { label: "</>", title: "Código", apply: (s) => ["`", s || "código", "`"] },
  { label: "∑", title: "Fórmula", apply: (s) => ["$", s || "x^2", "$"] },
];

export function NotaEditor({ nota, editarInicial }: { nota: Nota; editarInicial: boolean }) {
  const router = useRouter();
  const { materiaId, askChat } = useWorkspace();
  const [titulo, setTitulo] = useState(nota.titulo);
  const [contenido, setContenido] = useState(nota.contenido);
  const [modo, setModo] = useState<"escribir" | "leer">(
    editarInicial || !nota.contenido.trim() ? "escribir" : "leer"
  );
  const [estado, setEstado] = useState<Estado>("guardado");
  const [savedAt, setSavedAt] = useState(nota.updatedAt);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ titulo, contenido });
  const lastSaved = useRef({ titulo: nota.titulo, contenido: nota.contenido });

  useLayoutEffect(() => {
    latest.current = { titulo, contenido };
  }, [titulo, contenido]);

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const snapshot = latest.current;
    if (
      snapshot.titulo === lastSaved.current.titulo &&
      snapshot.contenido === lastSaved.current.contenido
    ) {
      setEstado("guardado");
      return;
    }
    setEstado("guardando");
    try {
      const response = await apiFetch(`/api/notas/${nota.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
        keepalive: true,
      });
      if (!response.ok) throw new Error();
      const tituloCambio = snapshot.titulo !== lastSaved.current.titulo;
      lastSaved.current = snapshot;
      setSavedAt(new Date().toISOString());
      setEstado(
        latest.current.titulo === snapshot.titulo && latest.current.contenido === snapshot.contenido
          ? "guardado"
          : "pendiente"
      );
      if (tituloCambio) router.refresh();
    } catch {
      setEstado("error");
    }
  }, [nota.id, router]);

  const schedule = useCallback(() => {
    setEstado("pendiente");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 800);
  }, [save]);

  useEffect(() => {
    const flush = () => void save();
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [save]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 360)}px`;
  }, [contenido, modo]);

  useEffect(() => {
    if (modo === "escribir" && editarInicial) textareaRef.current?.focus();
  }, [modo, editarInicial]);

  function insertar(apply: (sel: string) => [string, string, string]) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const [before, middle, after] = apply(contenido.slice(start, end));
    const next = contenido.slice(0, start) + before + middle + after + contenido.slice(end);
    setContenido(next);
    schedule();
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + middle.length);
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "b") {
      event.preventDefault();
      insertar(FORMATOS[0].apply);
    } else if (mod && event.key.toLowerCase() === "i") {
      event.preventDefault();
      insertar(FORMATOS[1].apply);
    } else if (event.key === "Tab") {
      event.preventDefault();
      insertar(() => ["  ", "", ""]);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      } else if (mod && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setModo((m) => (m === "escribir" ? "leer" : "escribir"));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  async function borrar() {
    if (!window.confirm(`¿Borrar «${titulo}»? No se puede deshacer.`)) return;
    if (timer.current) clearTimeout(timer.current);
    lastSaved.current = latest.current;
    await apiFetch(`/api/notas/${nota.id}`, { method: "DELETE" });
    router.push(`/materias/${materiaId}/notas`);
    router.refresh();
  }

  const estadoLabel =
    estado === "guardando"
      ? "Guardando…"
      : estado === "pendiente"
        ? "Sin guardar"
        : estado === "error"
          ? "No pude guardar · reintentá con Ctrl+S"
          : `Guardado ${relativo(savedAt)}`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-8">
      <FocusRegister kind="nota" id={nota.id} titulo={titulo} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex border border-border-subtle" role="tablist" aria-label="Modo">
          {(["escribir", "leer"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modo === m}
              onClick={() => setModo(m)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider ${
                modo === m ? "bg-surface-elevated text-foreground" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {m === "escribir" ? "Escribir" : "Leer"}
            </button>
          ))}
        </div>
        {modo === "escribir" && (
          <div className="flex border border-border-subtle" aria-label="Formato">
            {FORMATOS.map((f) => (
              <button
                key={f.label}
                type="button"
                title={f.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertar(f.apply)}
                className="min-w-8 px-2 py-1.5 text-xs text-foreground-muted hover:bg-surface hover:text-foreground"
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        <span
          className={`ml-auto font-mono text-[10px] uppercase tracking-wider ${
            estado === "error" ? "text-red-300" : "text-foreground-subtle"
          }`}
          role="status"
        >
          {estadoLabel}
        </span>
      </div>

      <input
        value={titulo}
        onChange={(e) => {
          setTitulo(e.target.value);
          schedule();
        }}
        onBlur={() => void save()}
        aria-label="Título de la nota"
        placeholder="Título"
        className="mb-4 w-full bg-transparent font-serif text-4xl leading-tight outline-none placeholder:text-foreground-subtle"
      />

      {modo === "escribir" ? (
        <textarea
          ref={textareaRef}
          value={contenido}
          onChange={(e) => {
            setContenido(e.target.value);
            schedule();
          }}
          onKeyDown={onKeyDown}
          onBlur={() => void save()}
          aria-label="Contenido de la nota en Markdown"
          placeholder={"Escribí en Markdown: ## títulos, - listas, **negrita**, $fórmulas$…"}
          className="note-editor w-full resize-none bg-transparent text-foreground outline-none"
          spellCheck
        />
      ) : contenido.trim() ? (
        <div onDoubleClick={() => setModo("escribir")} title="Doble click para editar">
          <ChatMarkdown className="doc-markdown">{contenido}</ChatMarkdown>
        </div>
      ) : (
        <p className="text-foreground-muted">
          Nota vacía.{" "}
          <button type="button" onClick={() => setModo("escribir")} className="text-accent underline">
            Empezá a escribir
          </button>
        </p>
      )}

      <div className="mt-12 flex flex-wrap gap-2 border-t border-border-subtle pt-4 text-sm">
        <button
          type="button"
          onClick={() => askChat("Repasá esta nota: corregí errores conceptuales, completá lo que falte según el material y decime qué preguntar en clase.")}
          className="border border-border px-3 py-2 hover:border-accent"
        >
          Repasar con el chat
        </button>
        <button
          type="button"
          onClick={() => askChat("Armame un examen corto de práctica sobre esta nota.", { send: true })}
          className="border border-border px-3 py-2 hover:border-accent"
        >
          Examen sobre esta nota
        </button>
        <button
          type="button"
          onClick={() => descargarMarkdown(titulo, `# ${titulo}\n\n${contenido}`)}
          className="border border-border px-3 py-2 text-foreground-muted hover:border-accent hover:text-foreground"
        >
          Descargar .md
        </button>
        <button
          type="button"
          onClick={() => void borrar()}
          className="ml-auto px-3 py-2 text-foreground-subtle hover:text-red-300"
        >
          Borrar nota
        </button>
      </div>
    </div>
  );
}
