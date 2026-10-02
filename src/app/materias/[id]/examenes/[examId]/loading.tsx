"use client";

import { MateriaLayoutSkeleton } from "@/components/MateriaLayoutSkeleton";
import { Bone } from "@/components/Skeleton";

export default function ExamenLoading() {
  return (
    <MateriaLayoutSkeleton>
      {() => (
        <>
          <div className="mb-8">
            <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
              Exámenes
            </div>
            <h2 className="font-serif text-2xl">
              <Bone className="w-48" />
            </h2>
          </div>

          <div className="border border-border-subtle p-6 mb-8">
            <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
              Archivo
            </div>
            <p className="font-serif text-xl mb-1">
              <Bone className="w-64" />
            </p>
            <p className="text-sm text-foreground-muted mb-4">
              <Bone className="w-16" />
            </p>
            <span className="text-accent text-sm">Ver archivo online →</span>
          </div>

          <div className="border border-border-subtle p-6 mb-8">
            <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
              Temas que entran
            </div>
            <div className="mb-4 divide-y divide-border-subtle border border-border-subtle">
              {["w-40", "w-52", "w-36"].map((width) => (
                <div key={width} className="p-3 flex items-center justify-between gap-3 text-sm">
                  <span>
                    <Bone className={width} />
                  </span>
                  <span className="text-xs font-mono uppercase">
                    <Bone className="w-20" />
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 px-3 py-2 bg-surface border border-border text-sm text-foreground-subtle">
                Espacios vectoriales
              </div>
              <span className="px-4 py-2 bg-accent text-background text-sm opacity-50">
                Agregar tema
              </span>
            </div>
          </div>

          <span className="text-sm text-foreground-muted">← Volver a exámenes</span>

          <div className="mt-12 pt-6 border-t border-border-subtle">
            <span className="text-sm text-foreground-muted">Eliminar este examen</span>
          </div>
        </>
      )}
    </MateriaLayoutSkeleton>
  );
}
