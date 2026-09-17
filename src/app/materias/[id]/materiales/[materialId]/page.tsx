import { notFound } from "next/navigation";
import { MateriaLayout } from "@/components/MateriaLayout";
import { MaterialViewer } from "@/components/MaterialViewer";
import { getMateria, getMaterial } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; materialId: string }>;
  searchParams: Promise<{ volver?: string; etiqueta?: string }>;
}

export default async function MaterialViewerPage({
  params,
  searchParams,
}: PageProps) {
  const { id, materialId } = await params;
  const query = await searchParams;
  const [materia, material] = await Promise.all([getMateria(id), getMaterial(materialId)]);
  if (!materia) notFound();
  if (!material || material.materiaId !== id) notFound();

  const fallbackHref = `/materias/${id}/apuntes`;
  const rawBackHref = query.volver?.trim() || "";
  const backHref =
    rawBackHref.startsWith(`/materias/${id}`) ? rawBackHref : fallbackHref;
  const backLabel = query.etiqueta?.trim() || "Volver a Apuntes";
  const materiaInfo = [materia.faculty, materia.catedra].filter(Boolean).join(" · ");

  return (
    <MateriaLayout
      materiaId={id}
      materiaName={materia.name}
      materiaInfo={materiaInfo || "Privada"}
    >
      <MaterialViewer
        materiaId={id}
        materialId={material.id}
        name={material.name}
        type={material.type}
        size={material.size}
        backHref={backHref}
        backLabel={backLabel}
      />
    </MateriaLayout>
  );
}
