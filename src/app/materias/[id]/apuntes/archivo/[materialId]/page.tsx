import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaterialViewer } from "@/components/MaterialViewer";
import { fileIconName } from "@/components/ui/Icon";
import { FocusRegister } from "@/components/workspace/WorkspaceContext";
import { withLectura } from "@/lib/db";
import { getMaterialCached } from "@/lib/page-data";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; materialId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, materialId } = await params;
  const material = await getMaterialCached(materialId);
  if (!material || material.materiaId !== id) return {};
  return { title: material.name.trim() || "Archivo" };
}

export default async function ArchivoPage({ params }: PageProps) {
  const { id, materialId } = await params;
  const material = await getMaterialCached(materialId);
  if (!material || material.materiaId !== id) notFound();
  const [conLectura] = await withLectura([material]);
  const esExamen = material.kind === "examen";

  return (
    <>
      <FocusRegister
        kind="material"
        id={material.id}
        titulo={material.name}
        icon={esExamen ? "examen" : fileIconName(material.type, material.name)}
      />
      <MaterialViewer
        materiaId={id}
        materialId={material.id}
        name={material.name}
        type={material.type}
        size={material.size}
        addedAt={material.addedAt}
        esExamen={esExamen}
        examenId={material.examId}
        lectura={conLectura?.lectura}
      />
    </>
  );
}
