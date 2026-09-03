import { notFound, redirect } from "next/navigation";
import { getMateria } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MateriaInicioPage({ params }: PageProps) {
  const { id } = await params;
  const materia = await getMateria(id);

  if (!materia) {
    notFound();
  }

  redirect(`/materias/${id}`);
}
