import { Bone, BoneBlock, SkeletonRegion } from "@/components/Skeleton";

export default function ClasesLoading() {
  return (
    <SkeletonRegion className="mx-auto box-content max-w-[880px] px-4 pb-16 pt-6 md:px-8 md:pt-10">
      <div className="flex items-center justify-between gap-4">
        <BoneBlock className="h-[38px] w-36 rounded-md" />
        <BoneBlock className="h-8 w-32 rounded-md" />
      </div>
      <div className="mt-8 px-3 pb-2">
        <Bone className="w-24" />
      </div>
      <div className="space-y-1">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex h-[52px] items-center gap-4 px-3">
            <Bone className="w-10" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <BoneBlock className="h-3.5 w-1/3 rounded-xs" />
              <BoneBlock className="h-3 w-2/3 rounded-xs" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}
