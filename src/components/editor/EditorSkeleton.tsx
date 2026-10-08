import { BoneBlock, SkeletonRegion } from "@/components/Skeleton";

export function EditorSkeleton() {
  return (
    <SkeletonRegion className="flex min-h-[120px] flex-col gap-3 pt-1 md:pl-11">
      <BoneBlock className="h-4 w-11/12 rounded-xs" />
      <BoneBlock className="h-4 w-4/5 rounded-xs" />
      <BoneBlock className="h-4 w-2/3 rounded-xs" />
      <BoneBlock className="h-4 w-1/3 rounded-xs" />
    </SkeletonRegion>
  );
}
