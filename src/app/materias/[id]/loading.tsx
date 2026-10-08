import { Bone, BoneBlock, SkeletonRegion } from "@/components/Skeleton";

export default function MateriaSectionLoading() {
  return (
    <SkeletonRegion className="mx-auto w-full max-w-[880px] space-y-4 px-4 pb-10 pt-8 md:px-8 md:pt-10">
      <Bone className="w-24" />
      <BoneBlock className="h-8 w-64 rounded-md" />
      <div className="space-y-2 pt-4">
        <BoneBlock className="h-[52px] w-full rounded-md" />
        <BoneBlock className="h-[52px] w-full rounded-md" />
        <BoneBlock className="h-[52px] w-full rounded-md" />
      </div>
    </SkeletonRegion>
  );
}
