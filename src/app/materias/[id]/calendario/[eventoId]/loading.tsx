import { Bone, BoneBlock, SkeletonRegion } from "@/components/Skeleton";

export default function EventoLoading() {
  return (
    <SkeletonRegion className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-6 md:px-8 md:pt-10">
      <div className="mb-4 flex min-h-8 items-center">
        <BoneBlock className="h-6 w-32 rounded-full" />
      </div>
      <BoneBlock className="h-9 w-72 max-w-full rounded-md" />
      <div className="mt-3">
        <Bone className="w-56" />
      </div>
      <div className="mt-8 space-y-3">
        <Bone className="w-14" />
        <div className="flex gap-1.5">
          <BoneBlock className="h-6 w-24 rounded-full" />
          <BoneBlock className="h-6 w-20 rounded-full" />
          <BoneBlock className="h-6 w-28 rounded-full" />
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <BoneBlock className="h-7 w-40 rounded-md" />
        <BoneBlock className="h-7 w-48 rounded-md" />
      </div>
      <div className="mt-10 space-y-3 border-t border-border-subtle pt-6">
        <Bone className="w-20" />
        <Bone className="w-full" />
        <Bone className="w-4/5" />
        <Bone className="w-3/5" />
      </div>
    </SkeletonRegion>
  );
}
