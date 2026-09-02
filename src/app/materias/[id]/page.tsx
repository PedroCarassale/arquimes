import { notFound } from "next/navigation";
import Link from "next/link";
import { getMateria, getMateriales, getExamenes, getTemas } from "@/lib/db";
import { MASTERY_LABELS, type Tema, type ExamenEnPreparacion } from "@/lib/types";
import { ReadinessPanel } from "./ReadinessPanel";
import { MaterialesSection } from "./MaterialesSection";
import { ExamenesSection } from "./ExamenesSection";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MateriaPage({ params }: PageProps) {
  const { id } = await params;
  const materia = getMateria(id);

  if (!materia) {
    notFound();
  }

  const materiales = getMateriales(id);
  const examenes = getExamenes(id);
  
  const examenesWithTemas = examenes.map((examen) => ({
    ...examen,
    temas: getTemas(examen.id),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <Link
          href="/materias"
          className="text-sm text-foreground-muted hover:text-foreground transition-colors"
        >
          ← Tus materias
        </Link>
      </div>

      <header className="mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl mb-2">{materia.name}</h1>
        {(materia.faculty || materia.catedra) && (
          <p className="text-foreground-muted font-mono text-sm">
            {[materia.faculty, materia.catedra].filter(Boolean).join(" · ")}
          </p>
        )}
      </header>

      <ReadinessPanel
        materiaId={id}
        materiales={materiales}
        examenes={examenesWithTemas}
      />

      <div className="mt-12 space-y-12">
        <ExamenesSection materiaId={id} examenes={examenesWithTemas} />
        <MaterialesSection materiaId={id} materiales={materiales} />
      </div>
    </div>
  );
}
