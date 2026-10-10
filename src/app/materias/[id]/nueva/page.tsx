import type { Metadata } from "next";
import { Launcher } from "@/components/workspace/Launcher";
import { TabMeta } from "@/components/workspace/WorkspaceContext";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pestaña nueva" };

export default function NuevaPestanaPage() {
  return (
    <div className="px-4 pb-16 pt-[12vh] md:px-8">
      <div className="mx-auto w-full max-w-[560px]">
        <TabMeta title="Pestaña nueva" />
        <Launcher mode="tab" />
      </div>
    </div>
  );
}
