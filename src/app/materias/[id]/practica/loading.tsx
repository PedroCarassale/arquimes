"use client";

import { MateriaLayoutSkeleton } from "@/components/MateriaLayoutSkeleton";
import { Bone } from "@/components/Skeleton";

export default function PracticaLoading() {
  return (
    <MateriaLayoutSkeleton>
      {({ snapshot }) => {
        const variant =
          snapshot.practicaVariant ??
          (snapshot.temasCount
            ? "pregunta"
            : snapshot.materialesCount
              ? "sin_temas_con_archivos"
              : "pregunta");
        return (
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl mb-1">Práctica</h2>
            <p className="text-sm text-foreground-muted mb-8">
              Una pregunta corta, no un cuestionario largo. Tu respuesta actualiza el
              dominio del tema y la preparación del resumen.
            </p>

            {variant === "sin_temas_sin_archivos" && (
              <div className="border border-border-subtle p-8 text-center">
                <p className="text-foreground-muted mb-4">
                  No hay temas ni archivos para practicar.
                </p>
                <p className="text-sm text-foreground-subtle mb-6">
                  Subí apuntes o cargá un examen con los temas que entran. Sin eso, la
                  preparación no puede moverse.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <span className="text-accent text-sm">Subir material →</span>
                  <span className="bg-accent text-background px-4 py-2 text-sm">
                    Cargar examen →
                  </span>
                </div>
              </div>
            )}

            {variant === "sin_temas_con_archivos" && (
              <div className="border border-border-subtle p-8 text-center">
                <p className="text-foreground-muted mb-4">
                  Tenés material, pero sin temas no hay práctica que alimente tu
                  preparación.
                </p>
                <p className="text-sm text-foreground-subtle mb-6">
                  Agregá los temas del examen para poder practicar y ver el porcentaje
                  en Resumen.
                </p>
                <span className="bg-accent text-background px-4 py-2 text-sm inline-block">
                  <Bone className="w-24 bg-background/20" />
                </span>
              </div>
            )}

            {variant === "pregunta" && (
              <div className="border border-border-subtle p-6">
                <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                  <Bone className="w-40" />
                </div>
                <h3 className="font-serif text-xl mb-3">
                  <Bone className="w-56" />
                </h3>
                <p className="text-sm mb-4">
                  <Bone className="w-full" />
                  <br />
                  <Bone className="w-3/4" />
                </p>
                {snapshot.materialesCount !== 0 && (
                  <p className="text-xs text-foreground-subtle mb-4">
                    <Bone className="w-72" />
                  </p>
                )}

                <div className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                  Tu respuesta
                </div>
                <textarea
                  aria-hidden="true"
                  tabIndex={-1}
                  readOnly
                  rows={4}
                  placeholder="Una frase alcanza."
                  className="w-full px-4 py-3 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none resize-y min-h-[96px]"
                />

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <span className="bg-accent text-background px-4 py-2 text-sm">
                    Así lo explicaría
                  </span>
                  <span className="border border-border px-4 py-2 text-sm">Todavía no</span>
                </div>
              </div>
            )}
          </div>
        );
      }}
    </MateriaLayoutSkeleton>
  );
}
