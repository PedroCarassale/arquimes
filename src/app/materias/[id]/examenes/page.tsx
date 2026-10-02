import { notFound } from "next/navigation";
import Link from "next/link";
import { MateriaLayout } from "@/components/MateriaLayout";
import { getExamenes, getMateria } from "@/lib/db";
import { examDisplayName, formatFileSize } from "@/lib/format";
import { RememberMateria } from "@/lib/materia-snapshot";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamenesPage({ params }: PageProps) {
  const { id } = await params;
  const materia = await getMateria(id);
  if (!materia) notFound();

  const examenes = await getExamenes(id);
  const materiaInfo = [materia.faculty, materia.catedra]
    .filter(Boolean)
    .join(" · ");

  return (
    <MateriaLayout
      materiaId={id}
      materiaName={materia.name}
      materiaInfo={materiaInfo || "Privada"}
    >
      <RememberMateria id={id} snapshot={{ examenesCount: examenes.length }} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl mb-1">Exámenes</h2>
          <p className="text-sm text-foreground-muted">
            Archivos de examen que cargaste en {materia.name}.
          </p>
        </div>
        <Link
          href={`/materias/${id}/examen`}
          className="text-center text-sm bg-accent text-background px-4 py-3 sm:py-2 hover:bg-accent/90 transition-colors uppercase tracking-wider"
        >
          Cargar examen →
        </Link>
      </div>

      {examenes.length === 0 ? (
        <div className="border border-border-subtle p-5 sm:p-8 text-center">
          <p className="text-foreground-muted mb-4">
            Todavía no cargaste un examen para esta materia.
          </p>
          <Link
            href={`/materias/${id}/examen`}
            className="text-accent text-sm hover:underline"
          >
            Cargar el primero →
          </Link>
        </div>
      ) : (
        <div className="border border-border-subtle divide-y divide-border-subtle">
          {examenes.map((examen) => (
            <Link
              key={examen.id}
              href={`/materias/${id}/examenes/${examen.id}`}
              className="block p-4 hover:bg-surface transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                <div>
                  <div className="font-serif text-xl">
                    {examDisplayName(examen)}
                  </div>
                  {examen.fileName && (
                    <div className="text-sm text-foreground-muted mt-1 [overflow-wrap:anywhere]">
                      {examen.fileName}
                      {typeof examen.fileSize === "number"
                        ? ` · ${formatFileSize(examen.fileSize)}`
                        : ""}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </MateriaLayout>
  );
}
