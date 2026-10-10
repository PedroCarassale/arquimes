import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MateriaWorkspace } from "@/components/workspace/MateriaWorkspace";
import { materiaTitleTemplate } from "@/lib/document-title";
import { getMateriaCached } from "@/lib/page-data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const materia = await getMateriaCached(id);
  if (!materia) return {};
  return { title: { default: materia.name, template: materiaTitleTemplate(materia.name) } };
}

export default async function MateriaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const materia = await getMateriaCached(id);
  if (!materia) notFound();
  const info = [materia.catedra, materia.faculty].filter(Boolean).join(" · ");
  return (
    <MateriaWorkspace materiaId={materia.id} materiaName={materia.name} materiaInfo={info || undefined}>
      {children}
    </MateriaWorkspace>
  );
}
