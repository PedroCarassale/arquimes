import { notFound } from "next/navigation";
import { ExamenForm } from "@/components/ExamenForm";
import { getMateria } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CrearExamenPage({ params }: PageProps) {
  const { id } = await params;
  const materia = await getMateria(id);
  if (!materia) notFound();

  return <ExamenForm materia={materia} />;
}
