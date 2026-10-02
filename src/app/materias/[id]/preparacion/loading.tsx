"use client";

import { MateriaLayoutSkeleton } from "@/components/MateriaLayoutSkeleton";
import { Bone, BoneBlock } from "@/components/Skeleton";

export default function PreparacionLoading() {
  return (
    <MateriaLayoutSkeleton>
      {({ snapshot }) => (
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
                <div className="block text-xs font-mono uppercase tracking-wider text-foreground-muted mb-2">
                  Temas a evaluar
                </div>
                <div className="relative">
                  <textarea
                    aria-hidden="true"
                    tabIndex={-1}
                    readOnly
                    rows={8}
                    className="w-full resize-y bg-surface border border-border px-4 py-3 text-sm text-foreground focus:outline-none"
                  />
                  <div className="pointer-events-none absolute inset-x-4 top-3 space-y-0 text-sm">
                    {snapshot.hasPreparacionConfig &&
                      ["w-48", "w-36", "w-56", "w-40"].map((width) => (
                        <div key={width}>
                          <Bone className={width} />
                        </div>
                      ))}
                  </div>
                </div>
                <p className="text-xs text-foreground-muted mt-2">
                  <Bone className="w-24" />
                </p>
              </div>

              <div>
                <div className="block text-xs font-mono uppercase tracking-wider text-foreground-muted mb-2">
                  Fecha del parcial
                </div>
                <div className="flex h-11 w-full items-center bg-surface border border-border px-3 text-sm">
                  <Bone className="w-24" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <span className="border border-accent px-4 py-2 text-xs font-mono uppercase tracking-wider text-accent">
                  Guardar configuración
                </span>
                <span
                  className={`bg-accent px-4 py-2 text-xs font-mono uppercase tracking-wider text-background ${
                    snapshot.hasPreparacionConfig ? "" : "opacity-60"
                  }`}
                >
                  {snapshot.hasPlan ? "Regenerar plan" : "Generar plan"}
                </span>
              </div>
            </div>

            {snapshot.hasPlan ? (
              <div className="space-y-6">
                <div className="border border-accent-muted bg-accent-muted/20 p-5">
                  <div className="text-xs font-mono uppercase tracking-wider text-foreground-muted mb-2">
                    Resumen del plan
                  </div>
                  <h3 className="font-serif text-xl mb-2">
                    <Bone className="w-80" />
                  </h3>
                  <p className="text-sm text-foreground-muted">
                    <Bone className="w-56" />
                  </p>
                </div>
                <div>
                  <h3 className="font-serif text-lg mb-3">Semanas</h3>
                  <div className="space-y-3">
                    {[0, 1].map((i) => (
                      <BoneBlock key={i} className="h-28 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-border-subtle p-6 text-sm text-foreground-muted">
                Guardá tus temas y la fecha del parcial para ver tu plan de estudio acá.
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="border border-border-subtle p-5">
              <h3 className="font-serif text-lg mb-2">Hitos</h3>
              {snapshot.hasPlan ? (
                <div className="space-y-3 text-sm">
                  {[0, 1, 2].map((i) => (
                    <div key={i}>
                      <div>
                        <Bone className="w-40" />
                      </div>
                      <div className="text-xs mb-1">
                        <Bone className="w-20" />
                      </div>
                      <div>
                        <Bone className="w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground-muted">
                  Se completan cuando generás el plan.
                </p>
              )}
            </div>

            <div className="border border-border-subtle p-5 text-xs text-foreground-muted">
              Esquema JSON del plan: <code>resumen</code>, <code>semanas</code>,{" "}
              <code>agendaDiaria</code>, <code>hitos</code>.
            </div>
          </aside>
        </div>
      )}
    </MateriaLayoutSkeleton>
  );
}
