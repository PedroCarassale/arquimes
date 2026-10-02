"use client";

import { MateriaLayoutSkeleton } from "@/components/MateriaLayoutSkeleton";
import { Bone } from "@/components/Skeleton";

export default function ExamenesLoading() {
  return (
    <MateriaLayoutSkeleton>
      {({ snapshot }) => {
        const count = snapshot.examenesCount ?? 2;
        return (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="font-serif text-2xl mb-1">Exámenes</h2>
                <p className="text-sm text-foreground-muted">
                  Archivos de examen que cargaste en {snapshot.name ?? <Bone className="w-32" />}.
                </p>
              </div>
              <span className="text-sm bg-accent text-background px-4 py-2 uppercase tracking-wider">
                Cargar examen →
              </span>
            </div>

            {count === 0 ? (
              <div className="border border-border-subtle p-8 text-center">
                <p className="text-foreground-muted mb-4">
                  Todavía no cargaste un examen para esta materia.
                </p>
                <span className="text-accent text-sm">Cargar el primero →</span>
              </div>
            ) : (
              <div className="border border-border-subtle divide-y divide-border-subtle">
                {Array.from({ length: Math.min(count, 10) }, (_, i) => (
                  <div key={i} className="block p-4">
                    <div className="font-serif text-xl">
                      <Bone className={i % 2 === 0 ? "w-48" : "w-40"} />
                    </div>
                    <div className="text-sm text-foreground-muted mt-1">
                      <Bone className="w-56" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      }}
    </MateriaLayoutSkeleton>
  );
}
