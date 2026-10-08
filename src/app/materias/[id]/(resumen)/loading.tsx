"use client";

import { Bone, BoneBlock, SkeletonRegion } from "@/components/Skeleton";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

export default function MateriaInicioLoading() {
  const { materiaName } = useWorkspace();
  return (
    <SkeletonRegion className="@container mx-auto w-full max-w-[960px] px-4 pb-16 pt-6 md:px-8 md:pt-10">
      <h1 className="t-display break-words">{materiaName || <Bone className="w-64" />}</h1>
      <div className="mt-2 text-[15px] leading-[22px]">
        <Bone className="w-72" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:@min-[680px]:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <BoneBlock key={index} className="h-[84px] rounded-lg max-md:h-[72px]" />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-1 gap-8 lg:@min-[720px]:grid-cols-12">
        <div className="space-y-1 lg:@min-[720px]:col-span-7">
          <div className="t-meta mb-2 flex h-7 items-center">Clases recientes</div>
          <BoneBlock className="h-11 w-full rounded-md" />
          <BoneBlock className="h-11 w-full rounded-md" />
        </div>
        <div className="space-y-1 lg:@min-[720px]:col-span-5">
          <div className="t-meta mb-2 flex h-7 items-center">Se viene</div>
          <BoneBlock className="h-12 w-full rounded-md" />
        </div>
      </div>
    </SkeletonRegion>
  );
}
