"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { MateriaLayout } from "@/components/MateriaLayout";
import { MASTERY_LABELS } from "@/lib/types";
import type { PracticeItem } from "@/lib/practice";

type EmptyKind = "no_temas_no_files" | "no_temas_with_files";

interface PracticaClientProps {
  materiaId: string;
  materiaName: string;
  materiaInfo: string;
  empty: EmptyKind | null;
  examHref?: string;
  item: PracticeItem | null;
}

export function PracticaClient({
  materiaId,
  materiaName,
  materiaInfo,
  empty,
  examHref,
  item: initialItem,
}: PracticaClientProps) {
  const [item, setItem] = useState<PracticeItem | null>(initialItem);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    temaName: string;
    previousLabel: string;
    masteryLabel: string;
    preparation: number;
    nextItem: PracticeItem | null;
  } | null>(null);

  async function submit(outcome: "lo_tengo" | "todavia_no") {
    if (!item) return;
    if (outcome === "lo_tengo" && answer.trim().length < 8) {
      setError("Escribí una frase corta antes de marcar que lo tenés.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/materias/${materiaId}/practica`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temaId: item.temaId,
          outcome,
          answer: answer.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar la práctica.");
      }
      setResult({
        temaName: data.temaName,
        previousLabel: data.previousLabel,
        masteryLabel: data.masteryLabel,
        preparation: data.preparation,
        nextItem: data.nextItem,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  function continuePractice() {
    if (!result?.nextItem) return;
    setItem(result.nextItem);
    setAnswer("");
    setResult(null);
    setError(null);
  }

  return (
    <MateriaLayout
      materiaId={materiaId}
      materiaName={materiaName}
      materiaInfo={materiaInfo}
    >
      <div className="max-w-2xl">
        <h2 className="font-serif text-2xl mb-1">Práctica</h2>
        <p className="text-sm text-foreground-muted mb-8">
          Una pregunta corta, no un cuestionario largo. Tu respuesta actualiza el
          dominio del tema y la preparación del resumen.
        </p>

        {empty === "no_temas_no_files" && (
          <div className="border border-border-subtle p-8 text-center">
            <p className="text-foreground-muted mb-4">
              No hay temas ni archivos para practicar.
            </p>
            <p className="text-sm text-foreground-subtle mb-6">
              Subí apuntes o cargá un examen con los temas que entran. Sin eso, la
              preparación no puede moverse.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={`/materias/${materiaId}/cargar`}
                className="text-accent text-sm hover:underline"
              >
                Subir material →
              </Link>
              <Link
                href={`/materias/${materiaId}/examen`}
                className="bg-accent text-background px-4 py-2 text-sm hover:bg-accent/90 transition-colors"
              >
                Cargar examen →
              </Link>
            </div>
          </div>
        )}

        {empty === "no_temas_with_files" && (
          <div className="border border-border-subtle p-8 text-center">
            <p className="text-foreground-muted mb-4">
              Tenés material, pero sin temas no hay práctica que alimente tu
              preparación.
            </p>
            <p className="text-sm text-foreground-subtle mb-6">
              Agregá los temas del examen para poder practicar y ver el porcentaje
              en Resumen.
            </p>
            <Link
              href={examHref || `/materias/${materiaId}/examen`}
              className="bg-accent text-background px-4 py-2 text-sm hover:bg-accent/90 transition-colors inline-block"
            >
              {examHref ? "Agregar temas →" : "Cargar examen →"}
            </Link>
          </div>
        )}

        {!empty && result && (
          <div className="border border-accent p-6">
            <div className="text-xs font-mono text-accent uppercase tracking-wider mb-2">
              Práctica guardada
            </div>
            <p className="font-serif text-xl mb-2">{result.temaName}</p>
            <p className="text-sm text-foreground-muted mb-4">
              Este tema pasó de {result.previousLabel} a {result.masteryLabel}.
              Eso ya mueve la preparación estimada del resumen.
            </p>
            <p className="text-3xl font-serif mb-1">{result.preparation}%</p>
            <p className="text-sm text-foreground-muted mb-6">
              Preparación estimada ahora
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/materias/${materiaId}`}
                className="bg-accent text-background px-4 py-2 text-sm text-center hover:bg-accent/90 transition-colors"
              >
                Ver preparación en Resumen →
              </Link>
              {result.nextItem && (
                <button
                  type="button"
                  onClick={continuePractice}
                  className="border border-border px-4 py-2 text-sm hover:bg-surface transition-colors"
                >
                  Seguir practicando
                </button>
              )}
            </div>
          </div>
        )}

        {!empty && !result && item && (
          <div className="border border-border-subtle p-6">
            <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
              Tema · {MASTERY_LABELS[item.masteryState]}
            </div>
            <h3 className="font-serif text-xl mb-3">{item.temaName}</h3>
            <p className="text-sm mb-4">{item.prompt}</p>
            {item.materialHint && (
              <p className="text-xs text-foreground-subtle mb-4">
                {item.materialHint}
              </p>
            )}

            <label
              htmlFor="practica-respuesta"
              className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2"
            >
              Tu respuesta
            </label>
            <textarea
              id="practica-respuesta"
              aria-label="Tu respuesta"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Una frase alcanza."
              className="w-full px-4 py-3 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors resize-y min-h-[96px]"
            />

            {error && (
              <p role="alert" className="text-sm text-red-500 mt-3">
                {error}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={() => submit("lo_tengo")}
                disabled={saving}
                className="bg-accent text-background px-4 py-2 text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Así lo explicaría"}
              </button>
              <button
                type="button"
                onClick={() => submit("todavia_no")}
                disabled={saving}
                className="border border-border px-4 py-2 text-sm hover:bg-surface transition-colors disabled:opacity-50"
              >
                Todavía no
              </button>
            </div>
          </div>
        )}
      </div>
    </MateriaLayout>
  );
}
