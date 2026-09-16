import { notFound } from "next/navigation";
import { MateriaLayout } from "@/components/MateriaLayout";
import { StudyChatWorkspace } from "@/components/StudyChatWorkspace";
import { getMateria } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MateriaChatPage({ params }: PageProps) {
  const { id } = await params;
  const materia = await getMateria(id);
  if (!materia) notFound();

  const materiaInfo = [materia.faculty, materia.catedra].filter(Boolean).join(" · ");
  return (
    <MateriaLayout
      materiaId={id}
      materiaName={materia.name}
      materiaInfo={materiaInfo || "Privada"}
      immersive
    >
      <StudyChatWorkspace materiaId={id} />
    </MateriaLayout>
  );
}
