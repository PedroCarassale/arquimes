import { notFound } from "next/navigation";
import { MateriaWorkspace } from "@/components/workspace/MateriaWorkspace";
import { getMateria } from "@/lib/db";

export default async function MateriaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const materia = await getMateria(id);
  if (!materia) notFound();
  const info = [materia.faculty, materia.catedra].filter(Boolean).join(" · ");
  return (
    <MateriaWorkspace materiaId={materia.id} materiaName={materia.name} materiaInfo={info || undefined}>
      {children}
    </MateriaWorkspace>
  );
}
