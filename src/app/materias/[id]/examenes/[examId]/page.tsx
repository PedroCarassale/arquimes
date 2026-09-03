import { notFound } from "next/navigation";
import { MateriaLayout } from "@/components/MateriaLayout";
import { ExamenForm } from "@/components/ExamenForm";
import { getExamen, getMateria, getTemas } from "@/lib/db";
import { examDisplayName } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; examId: string }>;
}

export default async function ExamenDetailPage({ params }: PageProps) {
  const { id, examId } = await params;
  const materia = await getMateria(id);
  if (!materia) notFound();

  const examen = await getExamen(examId);
  if (!examen || examen.materiaId !== id) notFound();

  const temas = await getTemas(examId);
  const materiaInfo = [materia.faculty, materia.catedra]
    .filter(Boolean)
    .join(" · ");

  return (
    <MateriaLayout
      materiaId={id}
      materiaName={materia.name}
      materiaInfo={materiaInfo || "Privada"}
    >
      <div className="mb-8">
        <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
          Exámenes / {examDisplayName(examen)}
        </div>
        <h2 className="font-serif text-2xl">Editar examen</h2>
      </div>
      <ExamenForm
        materia={materia}
        mode="edit"
        initialExam={examen}
        initialTemas={temas}
      />
    </MateriaLayout>
  );
}
