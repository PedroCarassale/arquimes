"use client";

import { useMemo, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { Button, Icon, Textarea, cx } from "@/components/ui";
import type { ExamenParseado, Pregunta } from "@/lib/artefactos";

type Respuesta = { opcion?: number; texto?: string; autoeval?: boolean };

export function ExamenInteractivo({ examen }: { examen: ExamenParseado }) {
  const [respuestas, setRespuestas] = useState<Record<number, Respuesta>>({});
  const [corregido, setCorregido] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const total = examen.preguntas.length;

  const resultado = useMemo(() => {
    const porPregunta = examen.preguntas.map((pregunta, index) => {
      const respuesta = respuestas[index];
      const correcta =
        pregunta.opciones.length > 0
          ? respuesta?.opcion !== undefined && pregunta.opciones[respuesta.opcion]?.correcta === true
          : respuesta?.autoeval;
      return correcta;
    });
    return {
      correctas: porPregunta.filter(Boolean).length,
      pendientes: examen.preguntas.filter((p, i) => p.opciones.length === 0 && porPregunta[i] === undefined).length,
      porPregunta,
    };
  }, [examen.preguntas, respuestas]);

  const respondidas = Object.values(respuestas).filter((r) => r.opcion !== undefined || r.texto?.trim()).length;

  const set = (index: number, patch: Respuesta) =>
    setRespuestas((current) => ({ ...current, [index]: { ...current[index], ...patch } }));

  function reiniciar() {
    setRespuestas({});
    setCorregido(false);
    topRef.current?.scrollIntoView({ block: "start" });
  }

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
            correcta={resultado.porPregunta[index]}
            onChange={(patch) => set(index, patch)}
          />
        ))}
      </ol>

      <div className="sticky bottom-0 mt-10 border-t border-border-subtle bg-background/95 py-4 backdrop-blur">
        {!corregido ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => setCorregido(true)}>
              Corregir examen
            </Button>
            <span className="font-mono text-[11px] text-foreground-subtle">
              Respondiste {respondidas} de {total}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1" role="status">
              <p className="font-serif text-[22px] leading-7 text-foreground">
                Sacaste <span className="text-accent">{resultado.correctas}</span> de {total}
              </p>
              <p className="mt-0.5 text-[13px] leading-5 text-foreground-muted">
                {resultado.pendientes === 1
                  ? "Te falta autoevaluar 1 pregunta de desarrollo: comparala con la respuesta modelo."
                  : resultado.pendientes > 1
                    ? `Te faltan autoevaluar ${resultado.pendientes} preguntas de desarrollo: comparalas con la respuesta modelo.`
                    : "Corrección completa. Revisá las explicaciones de las que fallaste."}
              </p>
            </div>
            <Button variant="secondary" onClick={reiniciar}>
              Volver a intentar
            </Button>
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
    <li data-pregunta={index + 1}>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] leading-4 text-foreground-subtle">
        <span className="text-foreground-muted">Pregunta {pregunta.numero || index + 1}</span>
        {pregunta.tema && (
          <span className="inline-flex h-5 items-center rounded-full bg-hover px-2 text-foreground-muted">{pregunta.tema}</span>
        )}
        <span>{multiple ? "Opción múltiple" : "Desarrollo"}</span>
        {corregido && correcta !== undefined && (
          <span className={cx("inline-flex items-center gap-1", correcta ? "text-foreground" : "text-danger")}>
            <Icon name={correcta ? "check" : "x"} size={12} />
            {correcta ? "Bien" : "Revisar"}
          </span>
        )}
      </div>
      <ChatMarkdown className="doc-markdown">{pregunta.enunciado}</ChatMarkdown>

      {multiple ? (
        <div className="mt-4 space-y-1.5" role="radiogroup" aria-label={`Opciones de la pregunta ${index + 1}`}>
          {pregunta.opciones.map((opcion, i) => {
            const elegida = respuesta?.opcion === i;
            const estado = corregido
              ? opcion.correcta
                ? "bg-accent-muted text-foreground"
                : elegida
                  ? "bg-danger-muted text-foreground"
                  : "opacity-60"
              : elegida
                ? "bg-selected text-foreground"
                : "bg-hover hover:bg-selected";
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={elegida}
                disabled={corregido}
                onClick={() => onChange({ opcion: i })}
                className={cx(
                  "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-(--dur-fast) ease-(--ease-out) disabled:cursor-default",
                  estado
                )}
              >
                <span
                  className={cx(
                    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
                    elegida ? "bg-foreground text-background" : "bg-selected text-foreground-muted"
                  )}
                >
                  {String.fromCharCode(97 + i)}
                </span>
                <span className="min-w-0 flex-1">
                  <ChatMarkdown>{opcion.texto}</ChatMarkdown>
                </span>
                {corregido && opcion.correcta && <Icon name="check" size={16} className="mt-0.5 text-accent" />}
              </button>
            );
          })}
        </div>
      ) : (
        <Textarea
          value={respuesta?.texto ?? ""}
          onChange={(e) => onChange({ texto: e.target.value })}
          disabled={corregido}
          rows={4}
          placeholder="Escribí tu respuesta…"
          aria-label={`Tu respuesta a la pregunta ${index + 1}`}
          className="mt-4"
        />
      )}

      {corregido && (multiple ? pregunta.explicacion : pregunta.respuesta) && (
        <div className="mt-4 rounded-lg bg-surface px-4 py-3">
          <div className="t-meta mb-1">{multiple ? "Explicación" : "Respuesta modelo"}</div>
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
            <Button
              key={option.label}
              size="sm"
              variant="secondary"
              aria-pressed={respuesta?.autoeval === option.value}
              onClick={() => onChange({ autoeval: option.value })}
              className={cx(
                respuesta?.autoeval === option.value &&
                  (option.value ? "bg-selected text-foreground" : "bg-danger-muted text-danger hover:bg-danger-muted")
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </li>
  );
}
