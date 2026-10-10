import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtefactoViewer } from "@/components/workspace/ArtefactoViewer";
import { getArtefactoCached } from "@/lib/page-data";
import { listArtefactoVersiones } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; artefactoId: string }>;
  searchParams: Promise<{ v?: string | string[] }>;
}

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { id, artefactoId } = await params;
  const artefacto = await getArtefactoCached(artefactoId);
  if (!artefacto || artefacto.materiaId !== id) return {};
  return { title: artefacto.titulo.trim() || "Pergamino" };
}

export default async function GeneradoPage({ params, searchParams }: PageProps) {
  const [{ id, artefactoId }, query] = await Promise.all([params, searchParams]);
  const [artefacto, versiones] = await Promise.all([getArtefactoCached(artefactoId), listArtefactoVersiones(artefactoId)]);
  if (!artefacto || artefacto.materiaId !== id) notFound();

  const pedida = Number(Array.isArray(query.v) ? query.v[0] : query.v);
  const version = versiones.some((v) => v.version === pedida) ? pedida : artefacto.version;

  return (
    <ArtefactoViewer
      key={`${artefacto.id}-${artefacto.version}-${version}`}
      artefacto={artefacto}
      versiones={versiones}
      initialVersion={version}
    />
  );
}
