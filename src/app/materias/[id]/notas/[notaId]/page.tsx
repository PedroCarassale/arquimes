import { notFound } from "next/navigation";
import { getNota, listNotas } from "@/lib/workspace-store";
import { DocumentStrip } from "@/components/workspace/DocumentStrip";
import { NotaEditor } from "@/components/workspace/NotaEditor";
import { NuevaNotaButtons } from "@/components/workspace/NuevaNotaButtons";

export const dynamic = "force-dynamic";

export default async function NotaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; notaId: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const { id, notaId } = await params;
  const { editar } = await searchParams;
  const [nota, notas] = await Promise.all([getNota(notaId), listNotas(id)]);
  if (!nota || nota.materiaId !== id) notFound();

  return (
    <div className="flex min-h-full flex-col">
      <DocumentStrip
        allHref={`/materias/${id}/notas`}
        allLabel="Notas"
        activeId={nota.id}
        items={notas.map((n) => ({ id: n.id, label: n.titulo, href: `/materias/${id}/notas/${n.id}` }))}
        action={<NuevaNotaButtons materiaId={id} compact />}
      />
      <NotaEditor key={nota.id} nota={nota} editarInicial={editar === "1"} />
    </div>
  );
}
