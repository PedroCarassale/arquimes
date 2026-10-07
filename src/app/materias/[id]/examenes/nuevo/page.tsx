import Link from "next/link";
import { EvaluacionForm } from "@/components/workspace/EvaluacionForm";

export default async function NuevaEvaluacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <Link
        href={`/materias/${id}/examenes`}
        className="font-mono text-xs uppercase tracking-wider text-foreground-muted hover:text-foreground"
      >
        ← Exámenes y entregas
      </Link>
      <h2 className="mb-8 mt-4 font-serif text-3xl">Nuevo examen o entrega</h2>
      <EvaluacionForm materiaId={id} />
    </div>
  );
}
