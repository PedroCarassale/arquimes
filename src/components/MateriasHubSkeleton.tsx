"use client";

import { AppShell } from "./AppShell";
import { Bone, SkeletonRegion } from "./Skeleton";
import { HUB_KEY, useMateriaSnapshots } from "@/lib/materia-snapshot";

const steps = [
  "Subí tus apuntes y el material del examen.",
  "Charlá con el tutor para destrabar temas difíciles.",
  "Practicá pregunta por pregunta, tema por tema.",
  "Medí qué tan preparado estás antes de rendir.",
];

function todayLabel() {
  return new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function EmptyState({ isChatPicker }: { isChatPicker: boolean }) {
  return (
    <section className="mx-auto max-w-4xl border border-border-subtle bg-surface/50 p-5 sm:p-8 md:p-12">
      <div className="mb-8 sm:mb-10">
        <p className="text-xs font-mono uppercase tracking-[0.24em] text-foreground-muted">
          Primera noche en Arquimedes
        </p>
        <h2 className="mt-3 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">
          {isChatPicker
            ? "Cada chat empieza con una materia."
            : "Tu espacio para estudiar con foco, sin sentirte solo."}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground-muted">
          {isChatPicker
            ? "Creá tu primera materia y después vas a poder abrir su chat de estudio."
            : "Acá convertís apuntes sueltos en un plan claro para llegar al examen con más calma."}
        </p>
      </div>
      <div>
        <h3 className="mb-4 text-sm font-mono uppercase tracking-[0.22em] text-foreground-muted">
          Cómo usarlo
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step} className="border border-border-subtle bg-background/40 p-4">
              <p className="text-xs font-mono text-accent">0{index + 1}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{step}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 border-t border-border-subtle pt-6 sm:mt-10 sm:pt-8">
        <span className="inline-flex w-full items-center justify-center bg-accent px-6 py-3 sm:w-auto text-sm font-mono uppercase tracking-[0.12em] text-background">
          Agregar materia
        </span>
        <p className="mt-3 text-sm text-foreground-muted">
          {isChatPicker
            ? "Creala y abrimos el chat de estudio desde ahí."
            : "Empezá por una sola materia. El resto se va ordenando con vos."}
        </p>
      </div>
    </section>
  );
}

export function MateriasHubSkeleton({ mode }: { mode: "inicio" | "selector-chat" }) {
  const isChatPicker = mode === "selector-chat";
  const snapshots = useMateriaSnapshots();
  const materiaIds = snapshots?.get(HUB_KEY)?.materiaIds;
  const rows = materiaIds ?? ["a", "b", "c"];

  return (
    <AppShell>
      <SkeletonRegion className="px-4 py-6 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-1 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
            {isChatPicker ? "Elegí una materia para chatear" : "Tus materias"}
          </h1>
          <div className="text-sm text-foreground-muted capitalize" suppressHydrationWarning>
            {todayLabel()}
          </div>
        </div>

        {materiaIds && materiaIds.length === 0 ? (
          <EmptyState isChatPicker={isChatPicker} />
        ) : (
          <>
            {isChatPicker && (
              <p className="mb-6 text-sm text-foreground-muted">
                Cada chat pertenece a una materia. Elegí una para abrir su espacio de chat.
              </p>
            )}

            <div className="mb-6 hidden border-b border-border-subtle lg:block">
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                    <th className="pb-3 text-left font-normal">Materia / Cátedra</th>
                    <th className="pb-3 text-left font-normal">Próximo examen</th>
                    <th className="pb-3 text-center font-normal">Falta</th>
                    <th className="pb-3 text-center font-normal">Preparado</th>
                    <th className="pb-3 text-right font-normal">
                      {isChatPicker ? "Abrir chat" : "Siguiente acción"}
                    </th>
                  </tr>
                </thead>
              </table>
            </div>

            <div className="space-y-0">
              {rows.map((id) => {
                const materia = snapshots?.get(id);
                const info = materia?.info === "Privada" ? "Sin cátedra" : materia?.info;
                return (
                  <div
                    key={id}
                    className="mx-[-1rem] block border-b border-border-subtle px-4 py-4 lg:py-5"
                  >
                    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 lg:grid-cols-[1fr_200px_80px_100px_200px] lg:gap-4">
                      <div className="min-w-0">
                        <div className="mb-1 font-serif text-xl leading-tight">
                          {materia?.name ?? <Bone className="w-48" />}
                        </div>
                        <div className="text-sm text-foreground-muted">
                          {info ?? <Bone className="w-32" />}
                        </div>
                      </div>
                      <div className="order-3 lg:order-none">
                        <div className="text-sm">
                          <Bone className="w-28" />
                        </div>
                        <div className="text-sm">
                          <Bone className="w-20" />
                        </div>
                      </div>
                      <div className="order-4 text-right lg:order-none lg:text-center">
                        <div className="font-serif text-2xl">
                          <Bone className="w-8" />
                        </div>
                      </div>
                      <div className="text-right lg:text-center">
                        <div className="font-serif text-2xl">
                          <Bone className="w-12" />
                        </div>
                      </div>
                      <div className="order-5 col-span-2 text-sm lg:order-none lg:col-span-1 lg:text-right">
                        {isChatPicker ? (
                          <span className="text-accent">Abrir chat →</span>
                        ) : (
                          <Bone className="w-32" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <span className="text-sm text-accent">+ Crear materia</span>
            </div>
          </>
        )}
      </SkeletonRegion>
    </AppShell>
  );
}
