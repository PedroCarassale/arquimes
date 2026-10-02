"use client";

import { useSearchParams } from "next/navigation";
import { MateriaLayoutSkeleton } from "@/components/MateriaLayoutSkeleton";
import { Bone, BoneBlock } from "@/components/Skeleton";

export default function MaterialLoading() {
  const searchParams = useSearchParams();
  const backLabel = searchParams.get("etiqueta")?.trim() || "Volver a Apuntes";

  return (
    <MateriaLayoutSkeleton>
      {() => (
        <div className="space-y-4">
          <header className="flex flex-col gap-3 border border-border-subtle bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 text-xs font-mono uppercase tracking-wider text-foreground-muted">
                Visor de material
              </div>
              <h2 className="truncate font-serif text-2xl">
                <Bone className="w-72" />
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                <Bone className="w-24" />
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="border border-border px-3 py-2">{backLabel}</span>
              <span className="bg-accent px-3 py-2 text-background">Descargar</span>
            </div>
          </header>

          <div className="border border-border-subtle bg-background p-3 sm:p-4">
            <BoneBlock className="h-[70vh] w-full border border-border-subtle" />
          </div>
        </div>
      )}
    </MateriaLayoutSkeleton>
  );
}
