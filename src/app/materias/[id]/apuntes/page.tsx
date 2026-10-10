import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TabMeta } from "@/components/workspace/WorkspaceContext";
import { getMateriaCached } from "@/lib/page-data";
import { listApuntes } from "@/lib/workspace-store";
import { ApuntesLibrary, type ApuntesOrden, type ApuntesTipo } from "./ApuntesLibrary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Apuntes" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string | string[]; orden?: string | string[] }>;
}

function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ApuntesPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const materia = await getMateriaCached(id);
  if (!materia) notFound();
  const apuntes = await listApuntes(id);
  const tipoParam = first(query.tipo);
  const tipo: ApuntesTipo = tipoParam === "archivos" || tipoParam === "generados" ? tipoParam : "todos";
  const orden: ApuntesOrden = first(query.orden) === "nombre" ? "nombre" : "recientes";

  return (
    <>
      <TabMeta title="Apuntes" />
      <ApuntesLibrary materiaId={materia.id} initialItems={apuntes} tipo={tipo} orden={orden} />
    </>
  );
}
