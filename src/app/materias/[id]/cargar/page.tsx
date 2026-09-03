import { notFound } from "next/navigation";
import { CargarClient } from "./CargarClient";
import { getMateria } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CargarPage({ params }: PageProps) {
  const { id } = await params;
  const materia = await getMateria(id);
  if (!materia) notFound();
  return <CargarClient materia={materia} />;
}
