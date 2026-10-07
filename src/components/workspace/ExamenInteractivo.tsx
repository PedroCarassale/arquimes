"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import type { ExamenParseado, Pregunta } from "@/lib/artefactos";

type Respuesta = { opcion?: number; texto?: string; autoeval?: boolean };

type Cambio = { tema: string; antes: string; ahora: string };

export function ExamenInteractivo({
  artefactoId,
  materiaId,
  examen,
}: {
  artefactoId: string;
  materiaId: string;
  examen: ExamenParseado;
}) {
  const [respuestas, setRespuestas] = useState<Record<number, Respuesta>>({});
  const [corregido, setCorregido] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cambios, setCambios] = useState<Cambio[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const resultado = useMemo(() => {
    const porPregunta = examen.preguntas.map((pregunta, index) => {
      const respuesta = respuestas[index];
      let correcta: boolean | undefined;
      if (pregunta.opciones.length > 0) {
        correcta = respuesta?.opcion !== undefined && pregunta.opciones[respuesta.opcion]?.correcta === true;
      } else {
        correcta = respuesta?.autoeval;
      }
      return { pregunta, correcta };
    });
    return {
      correctas: porPregunta.filter((r) => r.correcta).length,
      pendientes: porPregunta.filter((r) => r.pregunta.opciones.length === 0 && r.correcta === undefined).length,
      porPregunta,
    };
  }, [examen.preguntas, respuestas]);

  const set = (index: number, patch: Respuesta) =>
    setRespuestas((current) => ({ ...current, [index]: { ...current[index], ...patch } }));

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/artefactos/${artefactoId}/resultado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultados: resultado.porPregunta
            .filter((r) => r.pregunta.tema && r.correcta !== undefined)
            .map((r) => ({ tema: r.pregunta.tema, correcta: r.correcta })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No pude guardar el resultado.");
      setCambios(payload.cambios ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude guardar el resultado.");
    } finally {
      setGuardando(false);
    }
  }

  function reiniciar() {
    setRespuestas({});
    setCorregido(false);
    setCambios(null);
    setError(null);
    topRef.current?.scrollIntoView({ block: "start" });
  }

  const total = examen.preguntas.length;

  return (
    <div ref={topRef} className="scroll-mt-16">
      {examen.intro && <ChatMarkdown className="doc-markdown">{examen.intro}</ChatMarkdown>}

      <ol className="mt-8 space-y-10">
        {examen.preguntas.map((pregunta, index) => (
          <PreguntaItem
            key={index}
            index={index}
            pregunta={pregunta}
            respuesta={respuestas[index]}
            corregido={corregido}
            correcta={resultado.porPregunta[index].correcta}
            onChange={(patch) => set(index, patch)}
          />
        ))}
      </ol>

      <div className="sticky bottom-0 mt-10 border-t border-border bg-background/95 py-4 backdrop-blur">
        {!corregido ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCorregido(true)}
              className="bg-accent px-5 py-2.5 text-sm text-background hover:bg-accent/90"
            >
              Corregir examen
            </button>
            <span className="text-sm text-foreground-muted">
              Respondiste {Object.values(respuestas).filter((r) => r.opcion !== undefined || r.texto?.trim()).length} de {total}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-3xl text-accent">
                {resultado.correctas}/{total}
              </span>
              <span className="text-sm text-foreground-muted">
                {resultado.pendientes > 0
                  ? `Autoevaluá ${resultado.pendientes} ${resultado.pendientes === 1 ? "pregunta de desarrollo" : "preguntas de desarrollo"} comparando con la respuesta modelo.`
                  : "Corrección completa."}
              </span>
            </div>
            {cambios ? (
              cambios.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {cambios.map((c) => (
                    <li key={c.tema}>
                      <span className="text-foreground">{c.tema}</span>{" "}
                      <span className="text-foreground-muted">
                        {c.antes} → <span className="text-accent">{c.ahora}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-foreground-muted">
                  Ninguna pregunta coincide con los temas de tus exámenes, así que tu preparación no cambió.{" "}
                  <Link href={`/materias/${materiaId}/examenes`} className="text-accent underline">
                    Cargá los temas
                  </Link>{" "}
                  para que cuenten.
                </p>
              )
            ) : null}
            {error && <p className="text-sm text-red-300">{error}</p>}
            <div className="flex flex-wrap gap-2">
              {!cambios && (
                <button
                  type="button"
                  disabled={guardando || resultado.pendientes > 0}
                  onClick={() => void guardar()}
                  className="bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90 disabled:opacity-50"
                  title={resultado.pendientes > 0 ? "Autoevaluá las preguntas de desarrollo primero" : undefined}
                >
                  {guardando ? "Guardando…" : "Guardar en mi preparación"}
                </button>
              )}
              <button
                type="button"
                onClick={reiniciar}
                className="border border-border px-4 py-2 text-sm hover:border-accent"
              >
                Volver a intentar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreguntaItem({
  index,
  pregunta,
  respuesta,
  corregido,
  correcta,
  onChange,
}: {
  index: number;
  pregunta: Pregunta;
  respuesta?: Respuesta;
  corregido: boolean;
  correcta?: boolean;
  onChange: (patch: Respuesta) => void;
}) {
  const multiple = pregunta.opciones.length > 0;
  return (
    <li className="border-l border-border pl-4 sm:pl-6" data-pregunta={index + 1}>
      <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
        <span>Pregunta {pregunta.numero || index + 1}</span>
        {pregunta.tema && <span className="border border-border-subtle px-1.5 py-0.5">{pregunta.tema}</span>}
        <span>{multiple ? "Opción múltiple" : "Desarrollo"}</span>
        {corregido && correcta !== undefined && (
          <span className={correcta ? "text-accent" : "text-red-300"}>{correcta ? "Bien" : "Revisar"}</span>
        )}
      </div>
      <ChatMarkdown className="doc-markdown">{pregunta.enunciado}</ChatMarkdown>

      {multiple ? (
        <div className="mt-4 space-y-2" role="radiogroup">
          {pregunta.opciones.map((opcion, i) => {
            const elegida = respuesta?.opcion === i;
            const estado = corregido
              ? opcion.correcta
                ? "border-accent bg-accent-muted"
                : elegida
                  ? "border-red-400/60 bg-red-500/10"
                  : "border-border-subtle opacity-60"
              : elegida
                ? "border-accent bg-surface-elevated"
                : "border-border-subtle hover:border-border";
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={elegida}
                disabled={corregido}
                onClick={() => onChange({ opcion: i })}
                className={`flex w-full items-start gap-3 border px-3 py-2.5 text-left text-sm transition-colors ${estado}`}
              >
                <span className="mt-0.5 font-mono text-xs text-foreground-muted">{String.fromCharCode(97 + i)})</span>
                <span className="min-w-0 flex-1">
                  <ChatMarkdown>{opcion.texto}</ChatMarkdown>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <textarea
          value={respuesta?.texto ?? ""}
          onChange={(e) => onChange({ texto: e.target.value })}
          disabled={corregido}
          rows={4}
          placeholder="Escribí tu respuesta…"
          className="note-editor mt-4 w-full border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-70"
        />
      )}

      {corregido && (multiple ? pregunta.explicacion : pregunta.respuesta) && (
        <div className="mt-4 border border-border-subtle bg-surface px-4 py-3">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-accent">
            {multiple ? "Explicación" : "Respuesta modelo"}
          </div>
          <ChatMarkdown>{multiple ? pregunta.explicacion : pregunta.respuesta}</ChatMarkdown>
        </div>
      )}

      {corregido && !multiple && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-foreground-muted">¿Te salió?</span>
          {[
            { value: true, label: "Sí" },
            { value: false, label: "No" },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={respuesta?.autoeval === option.value}
              onClick={() => onChange({ autoeval: option.value })}
              className={`border px-3 py-1 ${
                respuesta?.autoeval === option.value
                  ? option.value
                    ? "border-accent text-accent"
                    : "border-red-400/60 text-red-300"
                  : "border-border hover:border-accent"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
