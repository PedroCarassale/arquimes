import { notFound } from "next/navigation";
import Link from "next/link";
import { MateriaLayout } from "@/components/MateriaLayout";
import { EliminarExamen } from "@/components/EliminarExamen";
import { getExamen, getMateria, getMaterial } from "@/lib/db";
import { examDisplayName, formatFileSize } from "@/lib/format";

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

  const material = examen.materialId
    ? await getMaterial(examen.materialId)
    : undefined;
  const hasFile = Boolean(material?.contentBase64);
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
          Exámenes
        </div>
        <h2 className="font-serif text-2xl">{examDisplayName(examen)}</h2>
      </div>

      {hasFile ? (
        <div className="border border-border-subtle p-6 mb-8">
          <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
            Archivo
          </div>
          <p className="font-serif text-xl mb-1">
            {examen.fileName || material?.name}
          </p>
          <p className="text-sm text-foreground-muted mb-4">
            {formatFileSize(examen.fileSize ?? material?.size ?? 0)}
          </p>
          <a
            href={`/api/examenes/${examen.id}/archivo`}
            className="text-accent text-sm hover:underline"
          >
            Descargar archivo →
          </a>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted mb-8">
          Este examen no tiene archivo.
        </p>
      )}

      <Link
        href={`/materias/${id}/examenes`}
        className="text-sm text-foreground-muted hover:text-foreground"
      >
        ← Volver a exámenes
      </Link>

      <EliminarExamen examId={examen.id} materiaId={id} />
    </MateriaLayout>
  );
}
