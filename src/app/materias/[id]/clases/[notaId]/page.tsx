import { notFound } from "next/navigation";
import { getNota } from "@/lib/workspace-store";
import { NotaEditor } from "@/components/workspace/NotaEditor";

export const dynamic = "force-dynamic";

export default async function ClasePage({ params }: { params: Promise<{ id: string; notaId: string }> }) {
  const { id, notaId } = await params;
  const nota = await getNota(notaId);
  if (!nota || nota.materiaId !== id) notFound();

  return <NotaEditor key={nota.id} nota={nota} />;
}
