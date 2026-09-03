import { notFound } from "next/navigation";
import {
  getExamenes,
  getMateria,
  getMateriales,
  getTemasForMateria,
} from "@/lib/db";
import { buildPracticeItem, pickPracticeTema } from "@/lib/practice";
import { PracticaClient } from "./PracticaClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PracticaPage({ params }: PageProps) {
  const { id } = await params;
  const materia = await getMateria(id);
  if (!materia) notFound();

  const [temas, materiales, examenes] = await Promise.all([
    getTemasForMateria(id),
    getMateriales(id),
    getExamenes(id),
  ]);

  const materiaInfo =
    [materia.faculty, materia.catedra].filter(Boolean).join(" · ") || "Privada";

  const hasTemas = temas.length > 0;
  const hasFiles = materiales.length > 0;

  if (!hasTemas) {
    const examWithNoTemas = examenes[0];
    return (
      <PracticaClient
        materiaId={id}
        materiaName={materia.name}
        materiaInfo={materiaInfo}
        empty={hasFiles ? "no_temas_with_files" : "no_temas_no_files"}
        examHref={
          examWithNoTemas
            ? `/materias/${id}/examenes/${examWithNoTemas.id}`
            : undefined
        }
        item={null}
      />
    );
  }

  const tema = pickPracticeTema(temas);
  const item = tema ? buildPracticeItem(tema, materiales) : null;

  return (
    <PracticaClient
      materiaId={id}
      materiaName={materia.name}
      materiaInfo={materiaInfo}
      empty={null}
      item={item}
    />
  );
}
