import { Bone, BoneBlock, SkeletonRegion } from "@/components/Skeleton";

export function CalendarSkeleton() {
  return (
    <SkeletonRegion className="@container w-full px-4 pb-12 pt-3 md:px-8 md:pt-4">
      <div className="flex min-h-12 items-center gap-3">
        <BoneBlock className="h-7 w-44 rounded-md" />
        <BoneBlock className="h-7 w-24 rounded-md max-sm:hidden" />
        <div className="ml-auto flex gap-2">
          <BoneBlock className="h-7 w-32 rounded-md max-sm:hidden" />
          <BoneBlock className="h-7 w-28 rounded-md" />
        </div>
      </div>
      <div className="mt-3 grid gap-8 @min-[900px]:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="grid grid-cols-7 pb-1.5">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} className="px-2">
                <Bone className="w-6" />
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle">
            {Array.from({ length: 35 }, (_, index) => (
              <div key={index} className="min-h-[104px] bg-background p-2 max-md:min-h-16">
                <Bone className="w-4" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2 @min-[900px]:pt-[22px]">
          <Bone className="w-28" />
          {Array.from({ length: 4 }, (_, index) => (
            <BoneBlock key={index} className="h-[52px] w-full rounded-md" />
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
