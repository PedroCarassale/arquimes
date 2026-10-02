import { notFound } from "next/navigation";
import Link from "next/link";
import { MateriaLayout } from "@/components/MateriaLayout";
import { EliminarExamen } from "@/components/EliminarExamen";
import { AgregarTema } from "@/components/AgregarTema";
import {
  getExamen,
  getMateria,
  getMaterial,
  getTemas,
  materialHasContent,
} from "@/lib/db";
import { examDisplayName, formatFileSize } from "@/lib/format";
import { materialViewerRoute } from "@/lib/material-viewer";

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
  const hasFile = material ? materialHasContent(material) : false;
  const temas = await getTemas(examen.id);
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
        <div className="border border-border-subtle p-5 sm:p-6 mb-8">
          <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
            Archivo
          </div>
          <p className="font-serif text-xl mb-1 [overflow-wrap:anywhere]">
            {examen.fileName || material?.name}
          </p>
          <p className="text-sm text-foreground-muted mb-4">
            {formatFileSize(examen.fileSize ?? material?.size ?? 0)}
          </p>
          {material && (
            <Link
              href={materialViewerRoute({
                materiaId: id,
                materialId: material.id,
                volver: `/materias/${id}/examenes/${examId}`,
                etiqueta: "Volver al examen",
              })}
              className="text-accent text-sm hover:underline"
            >
              Ver archivo online →
            </Link>
          )}
        </div>
      ) : (
        <p className="text-sm text-foreground-muted mb-8">
          Este examen no tiene archivo.
        </p>
      )}

      <AgregarTema examenId={examen.id} initialTemas={temas} />

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
