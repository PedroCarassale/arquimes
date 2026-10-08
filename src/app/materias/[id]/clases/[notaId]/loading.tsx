import { Bone, BoneBlock, SkeletonRegion } from "@/components/Skeleton";

export default function ClaseLoading() {
  return (
    <SkeletonRegion className="mx-auto box-content max-w-[720px] px-4 pb-32 pt-6 md:px-8 md:pt-10">
      <div className="flex h-8 items-center md:pl-11">
        <Bone className="w-32" />
      </div>
      <div className="mt-2 md:pl-11">
        <BoneBlock className="h-[38px] w-64 rounded-md" />
      </div>
      <div className="mt-5 flex flex-col gap-3 pt-1 md:pl-11">
        <BoneBlock className="h-4 w-11/12 rounded-xs" />
        <BoneBlock className="h-4 w-4/5 rounded-xs" />
        <BoneBlock className="h-4 w-2/3 rounded-xs" />
        <BoneBlock className="h-4 w-1/3 rounded-xs" />
      </div>
    </SkeletonRegion>
  );
}
