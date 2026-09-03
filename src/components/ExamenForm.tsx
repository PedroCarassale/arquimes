"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import type { ExamenEnPreparacion, Materia, Tema } from "@/lib/types";

const MODALITIES = [
  "Escrito · presencial",
  "Escrito · virtual",
  "Oral · presencial",
  "Oral · virtual",
  "Multiple choice",
];

interface ExamenFormProps {
  materia: Materia;
  mode: "create" | "edit";
  initialExam?: ExamenEnPreparacion;
  initialTemas?: Tema[];
}

export function ExamenForm({
  materia,
  mode,
  initialExam,
  initialTemas = [],
}: ExamenFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"parcial" | "final">(
    initialExam?.type ?? "parcial"
  );
  const [name, setName] = useState(initialExam?.name ?? "");
  const [date, setDate] = useState(initialExam?.date ?? "");
  const [modality, setModality] = useState(
    initialExam?.modality ?? "Escrito · presencial"
  );
  const [objective, setObjective] = useState(initialExam?.objective ?? "");
  const [temas, setTemas] = useState<string[]>(
    initialTemas.map((t) => t.name)
  );
  const [customTema, setCustomTema] = useState("");

  function addCustomTema() {
    const next = customTema.trim();
    if (!next) return;
    if (temas.includes(next)) {
      setCustomTema("");
      return;
    }
    setTemas([...temas, next]);
    setCustomTema("");
  }

  function removeTema(tema: string) {
    setTemas(temas.filter((t) => t !== tema));
  }

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError("Indicá el nombre del examen.");
      return;
    }

    if (!date) {
      setError("Indicá la fecha del examen.");
      return;
    }

    setLoading(true);

    try {
      const url =
        mode === "create"
          ? `/api/materias/${materia.id}/examenes`
          : `/api/examenes/${initialExam!.id}`;
      const res = await apiFetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          date,
          modality,
          name: name.trim(),
          objective,
          temas,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || "No pude guardar el examen"
        );
      }

      if (mode === "create") {
        router.push(`/materias/${materia.id}`);
        router.refresh();
      } else {
        router.refresh();
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude guardar el examen");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initialExam) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/examenes/${initialExam.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || "No pude eliminar el examen"
        );
      }
      router.push(`/materias/${materia.id}/examenes`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pude eliminar el examen"
      );
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const form = (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
        <div>
          <h2 className="font-serif text-2xl mb-6">
            {mode === "create"
              ? "¿Qué examen vas a preparar?"
              : "Datos del examen"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              aria-pressed={type === "parcial"}
              onClick={() => setType("parcial")}
              className={`p-4 text-left border transition-colors ${
                type === "parcial"
                  ? "border-accent bg-accent-muted/20"
                  : "border-border hover:border-foreground-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg">Parcial</span>
                {type === "parcial" && (
                  <span className="w-4 h-4 rounded-full bg-accent" />
                )}
              </div>
            </button>
            <button
              type="button"
              aria-pressed={type === "final"}
              onClick={() => setType("final")}
              className={`p-4 text-left border transition-colors ${
                type === "final"
                  ? "border-accent bg-accent-muted/20"
                  : "border-border hover:border-foreground-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg">Final</span>
                {type === "final" && (
                  <span className="w-4 h-4 rounded-full bg-accent" />
                )}
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                Materia
              </div>
              <div
                aria-label="Materia"
                className="h-12 px-4 bg-surface border border-border text-foreground flex items-center"
              >
                {materia.name}
              </div>
            </div>
            <div>
              <label
                htmlFor="examen-nombre"
                className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2"
              >
                Nombre
              </label>
              <input
                id="examen-nombre"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ejemplo: Parcial 1"
                aria-label="Nombre del examen"
                className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label
                htmlFor="examen-fecha"
                className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2"
              >
                Fecha
              </label>
              <input
                id="examen-fecha"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Fecha del examen"
                className="w-full h-12 px-4 bg-surface border border-border text-foreground focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label
                htmlFor="examen-modalidad"
                className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2"
              >
                Modalidad
              </label>
              <select
                id="examen-modalidad"
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                aria-label="Modalidad"
                className="w-full h-12 px-4 bg-surface border border-border text-foreground focus:outline-none focus:border-accent"
              >
                {MODALITIES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="examen-objetivo"
              className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2"
            >
              Objetivo personal
            </label>
            <input
              id="examen-objetivo"
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ejemplo: llegar pudiendo resolver un parcial completo sin ayuda."
              aria-label="Objetivo personal"
              className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
            Temas incluidos
          </div>
          <h3 className="font-serif text-xl mb-4">Qué entra en este examen</h3>
          <p className="text-sm text-foreground-muted mb-4">
            Los temas son opcionales. Agregalos vos: no inventamos un programa
            para {materia.name}.
          </p>

          <div className="space-y-2 mb-4">
            {temas.length === 0 ? (
              <p className="text-sm text-foreground-subtle">
                Todavía no agregaste temas.
              </p>
            ) : (
              temas.map((tema) => (
                <div
                  key={tema}
                  className="w-full text-left p-3 border border-accent bg-accent-muted/20 flex items-center gap-3"
                >
                  <span className="flex-1 text-sm">{tema}</span>
                  <button
                    type="button"
                    onClick={() => removeTema(tema)}
                    aria-label={`Quitar tema ${tema}`}
                    className="text-xs text-foreground-muted hover:text-red-500"
                  >
                    Quitar
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customTema}
              onChange={(e) => setCustomTema(e.target.value)}
              placeholder="Agregar un tema…"
              aria-label="Agregar otro tema"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTema();
                }
              }}
              className="flex-1 h-10 px-3 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent text-sm"
            />
            <button
              type="button"
              onClick={addCustomTema}
              aria-label="Agregar tema"
              className="px-3 h-10 border border-border text-sm text-foreground-muted hover:text-foreground hover:border-foreground-muted transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500 mt-8">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 pt-6 border-t border-border-subtle">
        <Link
          href={
            mode === "create"
              ? `/materias/${materia.id}`
              : `/materias/${materia.id}/examenes`
          }
          className="text-sm text-foreground-muted hover:text-foreground transition-colors"
        >
          {mode === "create" ? "← Volver a la materia" : "← Volver a exámenes"}
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          aria-label="Guardar examen"
          className="bg-accent text-background px-6 py-2 text-sm uppercase tracking-wider hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Guardando..." : "Guardar examen →"}
        </button>
      </div>

      {mode === "edit" && (
        <div className="mt-12 pt-6 border-t border-border-subtle">
          {confirmDelete ? (
            <div role="alertdialog" aria-label="Confirmar eliminación">
              <p className="text-sm text-foreground-muted mb-4">
                ¿Eliminar este examen? También se borran sus temas. Esta acción
                no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm border border-border px-4 py-2 hover:border-foreground-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  aria-label="Confirmar eliminar examen"
                  className="text-sm text-red-500 border border-red-500/40 px-4 py-2 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {deleting ? "Eliminando..." : "Eliminar examen"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Eliminar examen"
              className="text-sm text-foreground-muted hover:text-red-500"
            >
              Eliminar este examen
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (mode === "edit") {
    return form;
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
          Preparación de examen
        </div>
        <h1 className="font-serif text-3xl mb-8">Crear examen objetivo</h1>
        {form}
      </div>
    </AppShell>
  );
}
