import { notFound } from "next/navigation";
import { ArtefactoViewer } from "@/components/workspace/ArtefactoViewer";
import { getArtefacto, listArtefactoVersiones } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; artefactoId: string }>;
}

export default async function GeneradoPage({ params }: PageProps) {
  const { id, artefactoId } = await params;
  const [artefacto, versiones] = await Promise.all([getArtefacto(artefactoId), listArtefactoVersiones(artefactoId)]);
  if (!artefacto || artefacto.materiaId !== id) notFound();

  return <ArtefactoViewer key={`${artefacto.id}-${artefacto.version}`} artefacto={artefacto} versiones={versiones} />;
}
