import { Bone, BoneBlock, SkeletonRegion } from "@/components/Skeleton";

export default function MateriaSectionLoading() {
  return (
    <SkeletonRegion className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <Bone className="w-24" />
      <BoneBlock className="h-8 w-64" />
      <BoneBlock className="h-24 w-full" />
      <BoneBlock className="h-24 w-full" />
    </SkeletonRegion>
  );
}
