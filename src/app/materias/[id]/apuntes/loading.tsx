"use client";

import { MateriaLayoutSkeleton } from "@/components/MateriaLayoutSkeleton";
import { Bone } from "@/components/Skeleton";

const collections = ["Todos los archivos", "Mis apuntes", "Bibliografía", "Imágenes"];

export default function ApuntesLoading() {
  return (
    <MateriaLayoutSkeleton>
      {({ snapshot }) => {
        const count = snapshot.materialesCount ?? 3;
        return (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="font-serif text-2xl mb-1">Apuntes y material</h2>
                <p className="text-sm text-foreground-muted">
                  Guardá PDFs, imágenes y documentos dentro de esta materia.
                </p>
              </div>
              <span className="text-sm bg-accent text-background px-4 py-2 text-center">
                Cargar apuntes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-serif text-lg mb-3">Colecciones</h3>
                  <div className="text-xs text-foreground-muted mb-3">
                    <Bone className="w-16" />
                  </div>
                  <div className="space-y-1">
                    {collections.map((label, index) => (
                      <div
                        key={label}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                          index === 0
                            ? "bg-surface-elevated text-foreground"
                            : index === 2
                              ? "text-foreground-subtle"
                              : "text-foreground-muted"
                        }`}
                      >
                        <span>{label}</span>
                        <span className="text-xs text-foreground-muted">
                          <Bone className="w-4" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-4">
                  <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                    Almacenamiento
                  </div>
                  <div className="text-sm text-foreground-muted">
                    <Bone className="w-24" />
                  </div>
                </div>
              </div>

              <div>
                <div className="border-2 border-dashed border-border p-5 sm:p-8 mb-6 text-center">
                  <h3 className="font-serif text-lg mb-2">Soltá archivos para cargarlos</h3>
                  <p className="text-sm text-foreground-muted mb-4">
                    PDF, texto, imágenes o ZIP · Hasta 100 MB por archivo
                  </p>
                  <span className="text-accent text-sm">Elegir archivos →</span>
                </div>

                {count === 0 ? (
                  <div className="text-center py-12 text-foreground-muted">
                    No hay archivos todavía. Arrastrá archivos o hacé clic en
                    &quot;Cargar apuntes&quot;.
                  </div>
                ) : (
                  <div className="border border-border-subtle">
                    <div className="hidden sm:grid grid-cols-[1fr_80px_120px_auto] gap-4 px-4 py-2 text-xs font-mono text-foreground-muted uppercase tracking-wider border-b border-border-subtle">
                      <div>Archivo</div>
                      <div>Tamaño</div>
                      <div>Subido</div>
                      <div className="text-right">Acción</div>
                    </div>
                    {Array.from({ length: Math.min(count, 12) }, (_, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[1fr_80px_120px_auto] gap-x-4 gap-y-1 px-4 py-3 items-center border-b border-border-subtle last:border-b-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono text-foreground-muted w-8 shrink-0">
                            <Bone className="w-6" />
                          </span>
                          <div className="text-sm truncate">
                            <Bone className={i % 2 === 0 ? "w-48" : "w-36"} />
                          </div>
                        </div>
                        <div className="hidden sm:block text-sm text-foreground-muted">
                          <Bone className="w-12" />
                        </div>
                        <div className="hidden sm:block text-sm text-foreground-muted">
                          <Bone className="w-16" />
                        </div>
                        <div className="text-right flex items-center justify-end gap-3">
                          <span className="text-xs text-accent">Ver →</span>
                          <span className="text-xs text-foreground-muted">Eliminar</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        );
      }}
    </MateriaLayoutSkeleton>
  );
}
