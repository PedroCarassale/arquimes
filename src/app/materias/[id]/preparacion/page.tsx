import { notFound } from "next/navigation";
import { MateriaLayout } from "@/components/MateriaLayout";
import { getMateria } from "@/lib/db";
import { PreparacionClient } from "./PreparacionClient";
import { RememberMateria } from "@/lib/materia-snapshot";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MateriaPreparacionPage({ params }: PageProps) {
  const { id } = await params;
  const materia = await getMateria(id);
  if (!materia) notFound();

  const materiaInfo = [materia.faculty, materia.catedra].filter(Boolean).join(" · ");

  return (
    <MateriaLayout
      materiaId={id}
      materiaName={materia.name}
      materiaInfo={materiaInfo || "Privada"}
    >
      <RememberMateria
        id={id}
        snapshot={{
          hasPreparacionConfig: Boolean(
            materia.preparacion?.fechaParcial && materia.preparacion.temas.length > 0
          ),
        }}
      />
      <PreparacionClient
        materiaId={id}
        initialPreparacion={materia.preparacion || null}
      />
    </MateriaLayout>
  );
}
