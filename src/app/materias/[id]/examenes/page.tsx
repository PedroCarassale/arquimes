import { notFound } from "next/navigation";
import Link from "next/link";
import { MateriaLayout } from "@/components/MateriaLayout";
import { getExamenes, getMateria, getTemas } from "@/lib/db";
import { examDisplayName, examTypeLabel, formatExamDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamenesPage({ params }: PageProps) {
  const { id } = await params;
  const materia = await getMateria(id);
  if (!materia) notFound();

  const examenes = await getExamenes(id);
  const withTemas = await Promise.all(
    examenes.map(async (examen) => ({
      examen,
      temas: await getTemas(examen.id),
    }))
  );

  const materiaInfo = [materia.faculty, materia.catedra]
    .filter(Boolean)
    .join(" · ");

  return (
    <MateriaLayout
      materiaId={id}
      materiaName={materia.name}
      materiaInfo={materiaInfo || "Privada"}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl mb-1">Exámenes</h2>
          <p className="text-sm text-foreground-muted">
            Los exámenes que estás preparando en {materia.name}.
          </p>
        </div>
        <Link
          href={`/materias/${id}/examen`}
          className="text-sm bg-accent text-background px-4 py-2 hover:bg-accent/90 transition-colors uppercase tracking-wider"
        >
          Cargar examen →
        </Link>
      </div>

      {withTemas.length === 0 ? (
        <div className="border border-border-subtle p-8 text-center">
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
          {withTemas.map(({ examen, temas }) => (
            <Link
              key={examen.id}
              href={`/materias/${id}/examenes/${examen.id}`}
              className="block p-4 hover:bg-surface transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                <div>
                  <div className="font-serif text-xl">{examDisplayName(examen)}</div>
                  <div className="text-sm text-foreground-muted">
                    {examTypeLabel(examen.type)}
                    {examen.modality ? ` · ${examen.modality}` : ""}
                  </div>
                  {examen.objective && (
                    <div className="text-sm text-foreground-subtle mt-1">
                      {examen.objective}
                    </div>
                  )}
                </div>
                <div className="text-sm text-foreground-muted sm:text-right">
                  <div>{formatExamDate(examen.date)}</div>
                  <div className="text-xs font-mono uppercase tracking-wider mt-1">
                    {temas.length === 0
                      ? "Sin temas"
                      : `${temas.length} tema${temas.length === 1 ? "" : "s"}`}
                  </div>
                </div>
              </div>
              {temas.length > 0 && (
                <p className="text-xs text-foreground-subtle mt-3">
                  {temas.map((t) => t.name).join(" · ")}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </MateriaLayout>
  );
}
