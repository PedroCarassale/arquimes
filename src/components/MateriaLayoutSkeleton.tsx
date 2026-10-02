"use client";

import { useParams } from "next/navigation";
import { MateriaLayout } from "./MateriaLayout";
import { Bone, SkeletonRegion } from "./Skeleton";
import { useMateriaSnapshot, type MateriaSnapshot } from "@/lib/materia-snapshot";

export function MateriaLayoutSkeleton({
  immersive = false,
  children,
}: {
  immersive?: boolean;
  children: (context: { materiaId: string; snapshot: MateriaSnapshot }) => React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const materiaId = params.id;
  const snapshot = useMateriaSnapshot(materiaId) ?? {};

  return (
    <MateriaLayout
      materiaId={materiaId}
      materiaName={snapshot.name ?? <Bone className="w-56" />}
      materiaInfo={snapshot.info ?? <Bone className="w-32" />}
      immersive={immersive}
    >
      <SkeletonRegion className={immersive ? "h-full" : undefined}>
        {children({ materiaId, snapshot })}
      </SkeletonRegion>
    </MateriaLayout>
  );
}
