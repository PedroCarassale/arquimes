"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ExamenEnPreparacion } from "@/lib/types";

type Tipo = "parcial" | "final" | "entrega";

const TIPOS: { value: Tipo; label: string; placeholder: string }[] = [
  { value: "parcial", label: "Parcial", placeholder: "Primer parcial" },
  { value: "final", label: "Final", placeholder: "Final de diciembre" },
  { value: "entrega", label: "Entrega de TP", placeholder: "TP 2 · Informe de laboratorio" },
];

function tipoDe(examen?: ExamenEnPreparacion): Tipo {
  if (examen?.kind === "entrega") return "entrega";
  return examen?.type === "final" ? "final" : "parcial";
}

export function EvaluacionForm({
  materiaId,
  examen,
  onDone,
}: {
  materiaId: string;
  examen?: ExamenEnPreparacion;
  onDone?: () => void;
}) {
  const router = useRouter();
  const editando = Boolean(examen);
  const [tipo, setTipo] = useState<Tipo>(tipoDe(examen));
  const [nombre, setNombre] = useState(examen?.name ?? "");
  const [fecha, setFecha] = useState(examen?.date ?? "");
  const [descripcion, setDescripcion] = useState(examen?.description ?? examen?.objective ?? "");
  const [temas, setTemas] = useState<string[]>([]);
  const [temaDraft, setTemaDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function agregarTema(raw = temaDraft) {
    const nuevos = raw
      .split(/[\n,;]+/)
      .map((t) => t.trim())
      .filter((t) => t && !temas.includes(t));
    if (nuevos.length) setTemas((current) => [...current, ...nuevos]);
    setTemaDraft("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const name = nombre.trim() || TIPOS.find((t) => t.value === tipo)!.placeholder;
    setSaving(true);
    setError(null);
    const body = {
      kind: tipo === "entrega" ? "entrega" : "examen",
      type: tipo === "entrega" ? "" : tipo,
      name,
      date: fecha,
      description: descripcion,
      temas: [...temas, ...(temaDraft.trim() ? [temaDraft.trim()] : [])],
    };
    try {
      const response = await apiFetch(
        editando ? `/api/examenes/${examen!.id}` : `/api/materias/${materiaId}/evaluaciones`,
        {
          method: editando ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No pude guardar.");
      if (editando) {
        onDone?.();
        router.refresh();
      } else {
        router.push(`/materias/${materiaId}/examenes/${payload.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude guardar.");
      setSaving(false);
    }
  }

  const label = "mb-1.5 block font-mono text-xs uppercase tracking-wider text-foreground-muted";
  const field =
    "w-full border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent";

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <span className={label}>Qué es</span>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={tipo === t.value}
              onClick={() => setTipo(t.value)}
              className={`border px-4 py-2 text-sm transition-colors ${
                tipo === t.value
                  ? "border-accent bg-accent-muted text-foreground"
                  : "border-border text-foreground-muted hover:border-accent hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <label className="block">
          <span className={label}>Nombre</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={TIPOS.find((t) => t.value === tipo)!.placeholder}
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>{tipo === "entrega" ? "Se entrega el" : "Fecha"}</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={`${field} [color-scheme:dark]`}
          />
        </label>
      </div>

      <label className="block">
        <span className={label}>De qué trata</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={5}
          placeholder={
            tipo === "entrega"
              ? "Consigna, formato de entrega, criterios de evaluación…"
              : "Unidades que entran, modalidad (escrito, oral, a libro abierto), qué suele tomar la cátedra…"
          }
          className={`${field} note-editor`}
        />
        <span className="mt-1 block text-xs text-foreground-subtle">Admite Markdown.</span>
      </label>

      {!editando && (
        <div>
          <span className={label}>Temas</span>
          {temas.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {temas.map((tema) => (
                <li key={tema} className="flex items-center gap-1 border border-border px-2 py-1 text-sm">
                  {tema}
                  <button
                    type="button"
                    aria-label={`Quitar ${tema}`}
                    onClick={() => setTemas((current) => current.filter((t) => t !== tema))}
                    className="px-1 text-foreground-muted hover:text-red-300"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            value={temaDraft}
            onChange={(e) => setTemaDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                agregarTema();
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/[\n,;]/.test(text)) {
                e.preventDefault();
                agregarTema(text);
              }
            }}
            placeholder="Escribí un tema y Enter (podés pegar una lista)"
            className={field}
          />
          <span className="mt-1 block text-xs text-foreground-subtle">
            Cada tema arranca en «No estudiado». Los exámenes de práctica lo van moviendo.
          </span>
        </div>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-accent px-5 py-2.5 text-sm text-background hover:bg-accent/90 disabled:opacity-60"
        >
          {saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear"}
        </button>
        {editando && (
          <button
            type="button"
            onClick={onDone}
            className="border border-border px-4 py-2 text-sm hover:border-accent"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
