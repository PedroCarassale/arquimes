import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNotaCached } from "@/lib/page-data";
import { NotaEditor } from "@/components/workspace/NotaEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; notaId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, notaId } = await params;
  const nota = await getNotaCached(notaId);
  if (!nota || nota.materiaId !== id) return {};
  return { title: nota.titulo.trim() || "Sin título" };
}

export default async function ClasePage({ params }: Props) {
  const { id, notaId } = await params;
  const nota = await getNotaCached(notaId);
  if (!nota || nota.materiaId !== id) notFound();

  return <NotaEditor key={nota.id} nota={nota} />;
}
