import { notFound } from "next/navigation";
import { ApuntesLibrary } from "./ApuntesLibrary";
import { getMateria, getMateriales } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApuntesPage({ params }: PageProps) {
  const { id } = await params;
  const materia = await getMateria(id);
  if (!materia) notFound();
  const materiales = await getMateriales(id);
  return (
    <ApuntesLibrary materia={materia} initialMateriales={materiales} />
  );
}
