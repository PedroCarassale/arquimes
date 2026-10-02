"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Bone, SkeletonRegion } from "@/components/Skeleton";
import { useMateriaSnapshot } from "@/lib/materia-snapshot";

export default function CargarLoading() {
  const { id } = useParams<{ id: string }>();
  const snapshot = useMateriaSnapshot(id);

  return (
    <AppShell>
      <SkeletonRegion className="px-4 py-6 sm:p-6 lg:p-8">
        <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
          Carga de material
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl mb-2">Seleccionar archivos</h1>
        <p className="text-sm text-foreground-muted mb-8">
          Paso 1 de 3 para cargar info del examen: subí apuntes o guías a{" "}
          {snapshot?.name ?? <Bone className="w-32" />}. Después cargás el archivo del examen
          y definís temas.
        </p>

        <div className="mb-8">
          <h2 className="font-serif text-2xl text-foreground-muted mb-2">
            Sumá material a la materia
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm text-foreground-muted">
              Podés cargar apuntes, guías, bibliografía, imágenes o documentos de clase.
            </p>
            <span className="text-xs font-mono text-foreground-muted">
              PDF · DOCX · PPTX · JPG · PNG · TXT · hasta 15 MB
            </span>
          </div>
        </div>

        <div className="border-2 border-dashed p-6 sm:p-10 lg:p-16 mb-8 text-center border-border">
          <div className="w-12 h-12 mx-auto mb-4 border border-accent flex items-center justify-center">
            <span className="text-accent text-2xl">↑</span>
          </div>
          <h3 className="font-serif text-xl mb-2">Arrastrá los archivos acá</h3>
          <p className="text-sm text-foreground-muted mb-6">
            También podés seleccionar archivos desde tu computadora.
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm bg-accent text-background px-6 py-2 uppercase tracking-wider">
              Explorar archivos
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <span className="text-sm text-foreground-muted">← Volver a la materia</span>
          <div className="flex items-center gap-3">
            <span className="border border-border px-4 py-2 text-xs font-mono uppercase tracking-wider text-foreground-muted">
              Paso 2: Cargar examen
            </span>
            <span className="bg-accent text-background px-6 py-2 text-sm uppercase tracking-wider">
              Guardar archivos →
            </span>
          </div>
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
