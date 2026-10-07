import { notFound } from "next/navigation";
import { getArtefacto, listArtefactoVersiones, listArtefactos } from "@/lib/workspace-store";
import { DocumentStrip } from "@/components/workspace/DocumentStrip";
import { ArtefactoViewer } from "@/components/workspace/ArtefactoViewer";

export const dynamic = "force-dynamic";

export default async function ArtefactoPage({
  params,
}: {
  params: Promise<{ id: string; artefactoId: string }>;
}) {
  const { id, artefactoId } = await params;
  const [artefacto, versiones, artefactos] = await Promise.all([
    getArtefacto(artefactoId),
    listArtefactoVersiones(artefactoId),
    listArtefactos(id),
  ]);
  if (!artefacto || artefacto.materiaId !== id) notFound();

  return (
    <div className="flex min-h-full flex-col">
      <DocumentStrip
        allHref={`/materias/${id}/generados`}
        allLabel="Generados"
        activeId={artefacto.id}
        items={artefactos.map((a) => ({
          id: a.id,
          label: a.titulo,
          href: `/materias/${id}/generados/${a.id}`,
          badge: a.tipo === "examen" ? "Ex" : undefined,
        }))}
      />
      <ArtefactoViewer key={`${artefacto.id}-${artefacto.version}`} artefacto={artefacto} versiones={versiones} />
    </div>
  );
}
