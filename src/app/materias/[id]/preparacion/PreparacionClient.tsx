"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Materia } from "@/lib/types";

type PreparacionState = NonNullable<Materia["preparacion"]>;

export function PreparacionClient({
  materiaId,
  initialPreparacion,
}: {
  materiaId: string;
  initialPreparacion: PreparacionState | null;
}) {
  const [temasInput, setTemasInput] = useState(
    initialPreparacion?.temas.join("\n") || ""
  );
  const [fechaParcial, setFechaParcial] = useState(
    initialPreparacion?.fechaParcial || ""
  );
  const [plan, setPlan] = useState(initialPreparacion?.plan);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const temas = useMemo(() => normalizeTemas(temasInput), [temasInput]);
  const hasConfig = temas.length > 0 && Boolean(fechaParcial);

  const signature = JSON.stringify({
    temas,
    fechaParcial: fechaParcial.trim(),
  });
  const initialSignature = JSON.stringify({
    temas: initialPreparacion?.temas || [],
    fechaParcial: initialPreparacion?.fechaParcial || "",
  });
  const [savedSignature, setSavedSignature] = useState(initialSignature);
  const hasUnsavedChanges = signature !== savedSignature;

  async function savePreparacion(showNotice = true): Promise<boolean> {
    setError(null);
    if (!hasConfig) {
      setError("Completá fecha y al menos un tema para guardar.");
      return false;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/materias/${materiaId}/preparacion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temas,
          fechaParcial,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        preparacion?: PreparacionState;
      };
      if (!res.ok || !data.preparacion) {
        throw new Error(data.error || "No pude guardar la preparación.");
      }

      setPlan(data.preparacion.plan);
      setSavedSignature(signature);
      if (showNotice) {
        setNotice("Configuración guardada.");
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude guardar la preparación.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setError(null);
    setNotice(null);
    if (!hasConfig) {
      setError("Primero definí temas y fecha del parcial.");
      return;
    }

    if (hasUnsavedChanges) {
      const saved = await savePreparacion(false);
      if (!saved) return;
    }

    setGenerating(true);
    try {
      const res = await apiFetch(`/api/materias/${materiaId}/preparacion/plan`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        preparacion?: PreparacionState;
      };
      if (!res.ok || !data.preparacion?.plan) {
        throw new Error(data.error || "No pude generar el plan.");
      }
      setPlan(data.preparacion.plan);
      setNotice("Plan generado. Si cambiás temas o fecha, regeneralo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude generar el plan.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-6">
        <header>
          <h2 className="font-serif text-2xl mb-2">Preparación</h2>
          <p className="text-sm text-foreground-muted">
            Configurá tu parcial cuando quieras. El plan aparece solo después de guardar
            temas y fecha.
          </p>
        </header>

        <div className="border border-border-subtle p-5 space-y-4">
          <div>
            <label
              htmlFor="temas-preparacion"
              className="block text-xs font-mono uppercase tracking-wider text-foreground-muted mb-2"
            >
              Temas a evaluar
            </label>
            <textarea
              id="temas-preparacion"
              value={temasInput}
              onChange={(event) => {
                setTemasInput(event.target.value);
                setNotice(null);
              }}
              rows={8}
              placeholder="Uno por línea. Ej: Derivadas parciales"
              className="w-full resize-y bg-surface border border-border px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
            />
            <p className="text-xs text-foreground-muted mt-2">
              {temas.length} tema{temas.length === 1 ? "" : "s"} cargado
              {temas.length === 1 ? "" : "s"}.
            </p>
          </div>

          <div>
            <label
              htmlFor="fecha-parcial"
              className="block text-xs font-mono uppercase tracking-wider text-foreground-muted mb-2"
            >
              Fecha del parcial
            </label>
            <input
              id="fecha-parcial"
              type="date"
              value={fechaParcial}
              onChange={(event) => {
                setFechaParcial(event.target.value);
                setNotice(null);
              }}
              className="h-11 w-full bg-surface border border-border px-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          {notice && <p className="text-sm text-accent">{notice}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void savePreparacion(true)}
              disabled={saving}
              className="border border-accent px-4 py-2 text-xs font-mono uppercase tracking-wider text-accent hover:bg-accent hover:text-background transition-colors disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar configuración"}
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating || saving || !hasConfig}
              className="bg-accent px-4 py-2 text-xs font-mono uppercase tracking-wider text-background hover:bg-accent/90 transition-colors disabled:opacity-60"
            >
              {generating
                ? "Generando..."
                : plan
                  ? "Regenerar plan"
                  : "Generar plan"}
            </button>
          </div>
        </div>

        {!plan ? (
          <div className="border border-dashed border-border-subtle p-6 text-sm text-foreground-muted">
            Guardá tus temas y la fecha del parcial para ver tu plan de estudio acá.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border border-accent-muted bg-accent-muted/20 p-5">
              <div className="text-xs font-mono uppercase tracking-wider text-foreground-muted mb-2">
                Resumen del plan
              </div>
              <h3 className="font-serif text-xl mb-2">{plan.resumen.objetivo}</h3>
              <p className="text-sm text-foreground-muted">
                {plan.resumen.diasHastaParcial} días hasta el parcial ·{" "}
                {plan.resumen.minutosPorDia} min por día
              </p>
            </div>

            <div>
              <h3 className="font-serif text-lg mb-3">Semanas</h3>
              <div className="space-y-3">
                {plan.semanas.map((semana) => (
                  <article key={`semana-${semana.semana}`} className="border border-border-subtle p-4">
                    <div className="text-xs font-mono uppercase tracking-wider text-foreground-muted mb-1">
                      Semana {semana.semana}
                    </div>
                    <div className="font-medium mb-2">{semana.foco}</div>
                    <p className="text-sm text-foreground-muted mb-2">
                      Temas: {semana.temas.join(", ")}
                    </p>
                    <p className="text-sm">{semana.meta}</p>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-serif text-lg mb-3">Agenda diaria</h3>
              <div className="border border-border-subtle divide-y divide-border-subtle">
                {plan.agendaDiaria.map((dia) => (
                  <div key={`${dia.fecha}-${dia.dia}`} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                        Día {dia.dia}
                      </span>
                      <span className="text-xs text-foreground-muted">{dia.fecha}</span>
                    </div>
                    <div className="font-medium mb-2">{dia.foco}</div>
                    <ul className="list-disc pl-5 text-sm text-foreground-muted space-y-1 mb-2">
                      {dia.tareas.map((tarea, index) => (
                        <li key={`${dia.dia}-tarea-${index}`}>{tarea}</li>
                      ))}
                    </ul>
                    <p className="text-sm">
                      <span className="text-foreground-muted">Checkpoint:</span>{" "}
                      {dia.checkpoint}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <div className="border border-border-subtle p-5">
          <h3 className="font-serif text-lg mb-2">Hitos</h3>
          {!plan ? (
            <p className="text-sm text-foreground-muted">
              Se completan cuando generás el plan.
            </p>
          ) : (
            <ul className="space-y-3">
              {plan.hitos.map((hito, index) => (
                <li key={`${hito.fecha}-${index}`} className="text-sm">
                  <div className="font-medium">{hito.titulo}</div>
                  <div className="text-xs text-foreground-muted mb-1">{hito.fecha}</div>
                  <div className="text-foreground-muted">{hito.criterio}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-border-subtle p-5 text-xs text-foreground-muted">
          Esquema JSON del plan:{" "}
          <code>resumen</code>, <code>semanas</code>, <code>agendaDiaria</code>,{" "}
          <code>hitos</code>.
        </div>
      </aside>
    </div>
  );
}

function normalizeTemas(raw: string): string[] {
  const list = raw
    .split(/\n|,/g)
    .map((topic) => topic.trim())
    .filter(Boolean)
    .slice(0, 20);
  return [...new Set(list)];
}
