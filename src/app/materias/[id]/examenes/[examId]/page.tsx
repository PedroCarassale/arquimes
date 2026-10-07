import { notFound } from "next/navigation";
import { getExamen, getTemas } from "@/lib/db";
import { EvaluacionDetalle } from "@/components/workspace/EvaluacionDetalle";

export const dynamic = "force-dynamic";

export default async function EvaluacionPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  const { id, examId } = await params;
  const examen = await getExamen(examId);
  if (!examen || examen.materiaId !== id) notFound();
  const temas = await getTemas(examId);
  return <EvaluacionDetalle key={examen.id} examen={examen} temas={temas} />;
}
