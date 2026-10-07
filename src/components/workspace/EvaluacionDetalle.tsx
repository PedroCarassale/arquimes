"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { calculatePreparation } from "@/lib/mastery";
import { cuentaRegresiva, evaluacionNombre, evaluacionTipoLabel, fechaLarga } from "@/lib/evaluaciones";
import { materialViewerRoute } from "@/lib/material-viewer";
import { MASTERY_LABELS, MASTERY_ORDER, type ExamenEnPreparacion, type MasteryState, type Tema } from "@/lib/types";
import { EvaluacionForm } from "./EvaluacionForm";
import { FocusRegister, useWorkspace } from "./WorkspaceContext";

const MASTERY_TONE: Record<MasteryState, string> = {
  no_estudiado: "text-foreground-subtle",
  empezado: "text-foreground-muted",
  estudiado: "text-foreground",
  necesita_practica: "text-red-300",
  dominado: "text-accent",
};

export function EvaluacionDetalle({
  examen,
  temas: initialTemas,
}: {
  examen: ExamenEnPreparacion;
  temas: Tema[];
}) {
  const router = useRouter();
  const { materiaId, askChat } = useWorkspace();
  const [editando, setEditando] = useState(false);
  const [temas, setTemas] = useState(initialTemas);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nombre = evaluacionNombre(examen);
  const cuenta = cuentaRegresiva(examen.date);
  const preparacion = calculatePreparation(temas);
  const esEntrega = examen.kind === "entrega";

  async function agregarTemas() {
    const nombres = draft
      .split(/[\n,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (nombres.length === 0) return;
    setError(null);
    for (const name of nombres) {
      const response = await apiFetch(`/api/examenes/${examen.id}/temas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || "No pude agregar el tema.");
        return;
      }
      setTemas((current) => [...current, payload as Tema]);
    }
    setDraft("");
    router.refresh();
  }

  async function cambiarEstado(tema: Tema, masteryState: MasteryState) {
    setTemas((current) => current.map((t) => (t.id === tema.id ? { ...t, masteryState } : t)));
    await apiFetch(`/api/temas/${tema.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masteryState }),
    });
    router.refresh();
  }

  async function quitarTema(tema: Tema) {
    setTemas((current) => current.filter((t) => t.id !== tema.id));
    await apiFetch(`/api/temas/${tema.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function borrar() {
    if (!window.confirm(`¿Borrar «${nombre}» y sus temas?`)) return;
    await apiFetch(`/api/examenes/${examen.id}`, { method: "DELETE" });
    router.push(`/materias/${materiaId}/examenes`);
    router.refresh();
  }

  const temasTexto = temas.map((t) => t.name).join(", ");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-8">
      <FocusRegister kind="examen" id={examen.id} titulo={nombre} />
      <Link
        href={`/materias/${materiaId}/examenes`}
        className="font-mono text-xs uppercase tracking-wider text-foreground-muted hover:text-foreground"
      >
        ← Exámenes y entregas
      </Link>

      {editando ? (
        <div className="mt-6">
          <EvaluacionForm materiaId={materiaId} examen={examen} onDone={() => setEditando(false)} />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase tracking-wider text-accent">{evaluacionTipoLabel(examen)}</div>
              <h2 className="mt-1 font-serif text-4xl leading-tight">{nombre}</h2>
              <p className="mt-2 text-sm text-foreground-muted">
                {fechaLarga(examen.date) ? (
                  <>
                    <span>{fechaLarga(examen.date)}</span>
                    {cuenta && <span className="text-foreground"> · {cuenta}</span>}
                  </>
                ) : (
                  "Sin fecha todavía"
                )}
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <button type="button" onClick={() => setEditando(true)} className="border border-border px-3 py-2 hover:border-accent">
                Editar
              </button>
              <button type="button" onClick={() => void borrar()} className="px-3 py-2 text-foreground-subtle hover:text-red-300">
                Borrar
              </button>
            </div>
          </div>

          <section className="mt-8">
            <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-foreground-muted">De qué trata</h3>
            {examen.description?.trim() || examen.objective?.trim() ? (
              <ChatMarkdown className="doc-markdown">{examen.description || examen.objective}</ChatMarkdown>
            ) : (
              <p className="text-sm text-foreground-muted">
                Sin descripción.{" "}
                <button type="button" onClick={() => setEditando(true)} className="text-accent underline">
                  Agregá de qué trata
                </button>{" "}
                para que el chat prepare mejor.
              </p>
            )}
          </section>
        </>
      )}

      {examen.materialId && examen.fileName && (
        <section className="mt-8">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-foreground-muted">Archivo</h3>
          <Link
            href={materialViewerRoute({ materiaId, materialId: examen.materialId })}
            className="inline-flex border border-border px-3 py-2 text-sm hover:border-accent"
          >
            {examen.fileName}
          </Link>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h3 className="font-mono text-xs uppercase tracking-wider text-foreground-muted">Temas</h3>
          {temas.length > 0 && (
            <span className="font-mono text-xs text-foreground-muted">
              Preparación estimada <span className="text-accent">{preparacion}%</span>
            </span>
          )}
        </div>
        {temas.length > 0 && (
          <>
            <div className="mb-4 h-1 w-full bg-surface-elevated">
              <div className="h-1 bg-accent transition-[width]" style={{ width: `${preparacion}%` }} />
            </div>
            <ul className="divide-y divide-border-subtle border-y border-border-subtle">
              {temas.map((tema) => (
                <li key={tema.id} className="group flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 text-sm">{tema.name}</span>
                  <select
                    value={tema.masteryState}
                    onChange={(e) => void cambiarEstado(tema, e.target.value as MasteryState)}
                    aria-label={`Estado de ${tema.name}`}
                    className={`border border-border-subtle bg-background py-1 pl-2 text-xs ${MASTERY_TONE[tema.masteryState]}`}
                  >
                    {MASTERY_ORDER.map((state) => (
                      <option key={state} value={state}>
                        {MASTERY_LABELS[state]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => askChat(`Explicame «${tema.name}» paso a paso para ${nombre}.`, { send: true })}
                    className="text-xs text-foreground-muted hover:text-accent"
                  >
                    Estudiar
                  </button>
                  <button
                    type="button"
                    onClick={() => void quitarTema(tema)}
                    aria-label={`Quitar ${tema.name}`}
                    className="text-xs text-foreground-subtle opacity-0 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {temas.length === 0 && (
          <p className="mb-3 text-sm text-foreground-muted">
            Sin temas cargados. Sin temas no puedo decirte qué tan preparado estás.
          </p>
        )}
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void agregarTemas();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Agregar tema (podés pegar varios separados por coma)"
            className="min-w-0 flex-1 border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button type="submit" className="border border-border px-4 py-2 text-sm hover:border-accent">
            Agregar
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </section>

      <section className="mt-10 border-t border-border-subtle pt-6">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-foreground-muted">Prepararme</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              askChat(
                esEntrega
                  ? `Ayudame a planificar «${nombre}»: desglosá la consigna en pasos y decime por dónde empezar.`
                  : `Armame un simulacro de «${nombre}»${temasTexto ? ` sobre ${temasTexto}` : ""}, con opción múltiple y desarrollo.`,
                { send: true }
              )
            }
            className="bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90"
          >
            {esEntrega ? "Planificar la entrega" : "Generar simulacro"}
          </button>
          <button
            type="button"
            onClick={() => askChat(`Hacé una guía de estudio para «${nombre}» con los temas y lo que suele tomarse.`, { send: true })}
            className="border border-border px-4 py-2 text-sm hover:border-accent"
          >
            Guía de estudio
          </button>
        </div>
      </section>
    </div>
  );
}
