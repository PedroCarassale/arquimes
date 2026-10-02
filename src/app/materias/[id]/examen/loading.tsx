"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Bone, SkeletonRegion } from "@/components/Skeleton";
import { useMateriaSnapshot } from "@/lib/materia-snapshot";

export default function CargarExamenLoading() {
  const { id } = useParams<{ id: string }>();
  const snapshot = useMateriaSnapshot(id);

  return (
    <AppShell>
      <SkeletonRegion className="px-4 py-6 sm:p-6 lg:p-8 max-w-2xl">
        <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
          {snapshot?.name ?? <Bone className="w-32" />}
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl mb-2">Cargar examen</h1>
        <p className="text-sm text-foreground-muted mb-8">
          Paso 2 de 3: subí el archivo del próximo examen. Sumá una nota corta
          de contexto y después agregá temas para practicar.
        </p>

        <div className="border-2 border-dashed p-6 sm:p-10 mb-6 text-center border-border">
          <h2 className="font-serif text-xl mb-2">Arrastrá el archivo acá</h2>
          <p className="text-sm text-foreground-muted mb-6">
            PDF, imagen o documento. Hasta 15 MB por archivo.
          </p>
          <span className="inline-block text-sm bg-accent text-background px-6 py-2 uppercase tracking-wider">
            Elegir archivo
          </span>
        </div>

        <div className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
          De qué trata
        </div>
        <div className="w-full h-12 px-4 mb-6 bg-surface border border-border text-foreground-subtle flex items-center">
          Parcial 2023, final diciembre…
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-border-subtle">
          <span className="text-sm text-foreground-muted">← Paso 1: Cargar apuntes</span>
          <div className="flex items-center gap-3">
            <span className="border border-border px-4 py-2 text-xs font-mono uppercase tracking-wider text-foreground-muted">
              Paso 3: Definir temas
            </span>
            <span className="bg-accent text-background px-6 py-2 text-sm uppercase tracking-wider">
              Guardar examen →
            </span>
          </div>
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
