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
    <section className="mx-auto max-w-4xl border border-border-subtle bg-surface/50 p-8 md:p-12">
      <div className="mb-10">
        <p className="text-xs font-mono uppercase tracking-[0.24em] text-foreground-muted">
          Primera noche en Arquimes
        </p>
        <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-tight md:text-5xl">
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
      <div className="mt-10 border-t border-border-subtle pt-8">
        <span className="inline-flex items-center justify-center bg-accent px-6 py-3 text-sm font-mono uppercase tracking-[0.12em] text-background">
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
      <SkeletonRegion className="p-8">
        <div className="mb-8 flex items-start justify-between">
          <h1 className="font-serif text-4xl">
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

            <div className="mb-6 border-b border-border-subtle">
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
                    className="mx-[-1rem] block border-b border-border-subtle px-4 py-5"
                  >
                    <div className="grid grid-cols-[1fr_200px_80px_100px_200px] items-center gap-4">
                      <div>
                        <div className="mb-1 font-serif text-xl">
                          {materia?.name ?? <Bone className="w-48" />}
                        </div>
                        <div className="text-sm text-foreground-muted">
                          {info ?? <Bone className="w-32" />}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm">
                          <Bone className="w-28" />
                        </div>
                        <div className="text-sm">
                          <Bone className="w-20" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-serif text-2xl">
                          <Bone className="w-8" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-serif text-2xl">
                          <Bone className="w-12" />
                        </div>
                      </div>
                      <div className="text-right text-sm">
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
