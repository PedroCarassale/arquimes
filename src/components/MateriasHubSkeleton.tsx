"use client";

import { AppShell } from "./AppShell";
import { Bone, BoneBlock, SkeletonRegion } from "./Skeleton";
import { HUB_KEY, useMateriaSnapshots } from "@/lib/materia-snapshot";

export function MateriasHubSkeleton() {
  const snapshots = useMateriaSnapshots();
  const materiaIds = snapshots?.get(HUB_KEY)?.materiaIds;

  if (materiaIds && materiaIds.length === 0) {
    return (
      <AppShell>
        <SkeletonRegion className="px-4 pb-16 pt-[20vh]">
          <div className="mx-auto flex max-w-[440px] flex-col items-center text-center">
            <BoneBlock className="h-24 w-[77px] rounded-lg opacity-50" />
            <h1 className="mt-8 font-serif text-[28px] leading-[34px]">Empezá por tu primera materia</h1>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              Cada materia guarda tus clases, apuntes y fechas.
            </p>
            <BoneBlock className="mt-8 h-10 w-36 rounded-md" />
          </div>
        </SkeletonRegion>
      </AppShell>
    );
  }

  const rows = materiaIds ?? ["a", "b", "c"];

  return (
    <AppShell>
      <SkeletonRegion className="mx-auto w-full max-w-[960px] px-4 pb-16 pt-6 md:px-8 md:pt-10">
        <div className="t-greeting">
          <Bone className="w-72" />
        </div>
        <div className="mt-2 font-mono text-[11px] leading-4">
          <Bone className="w-36" />
        </div>

        <div className="mt-10">
          <div className="t-meta mb-3 flex h-7 items-center">Se viene</div>
          <div className="space-y-1">
            <BoneBlock className="h-11 w-full rounded-md" />
            <BoneBlock className="h-11 w-full rounded-md" />
          </div>
        </div>

        <div className="mt-10">
          <div className="t-meta mb-3">Materias</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {rows.map((id) => {
              const materia = snapshots?.get(id);
              return (
                <div
                  key={id}
                  className="flex h-[120px] flex-col justify-between rounded-lg border border-border-subtle bg-surface px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="truncate font-serif text-[22px] leading-7">
                      {materia?.name ?? <Bone className="w-40" />}
                    </div>
                    {(materia?.info || !materia) && (
                      <div className="t-meta mt-0.5 truncate">{materia?.info ?? <Bone className="w-24" />}</div>
                    )}
                  </div>
                  <div className="text-[13px] leading-[18px]">
                    <Bone className="w-44" />
                  </div>
                </div>
              );
            })}
            <div className="h-[120px] rounded-lg border border-dashed border-border-subtle" />
          </div>
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
