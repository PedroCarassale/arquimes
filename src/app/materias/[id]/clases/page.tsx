import { EmptyState } from "@/components/ui";
import { NuevaNotaButtons } from "@/components/workspace/NuevaNotaButtons";
import { TabMeta } from "@/components/workspace/WorkspaceContext";
import { extractoPlano } from "@/lib/editor-markdown";
import { fechaCorta, hoyYmd, mesTitulo } from "@/lib/fechas";
import { listNotas } from "@/lib/workspace-store";
import { ClasesList, type GrupoClases } from "./ClasesList";

export const dynamic = "force-dynamic";

export default async function ClasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notas = await listNotas(id);

  const grupos: GrupoClases[] = [];
  for (const nota of [...notas].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const mes = mesTitulo(hoyYmd(new Date(nota.createdAt)).slice(0, 7));
    const clase = {
      id: nota.id,
      titulo: nota.titulo,
      fecha: fechaCorta(nota.createdAt) ?? "",
      extracto: extractoPlano(nota.contenido),
    };
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.mes === mes) ultimo.clases.push(clase);
    else grupos.push({ mes, clases: [clase] });
  }

  return (
    <div className="mx-auto box-content max-w-[880px] px-4 pb-16 pt-6 md:px-8 md:pt-10">
      <TabMeta title="Clases" />
      <header className="flex items-center justify-between gap-4">
        <h1 className="t-doc-title">Clases</h1>
        {notas.length > 0 && <NuevaNotaButtons materiaId={id} />}
      </header>

      {notas.length === 0 ? (
        <EmptyState
          icon="clase"
          title="Todavía no tenés clases anotadas."
          description="Cada clase es una página para tus apuntes. El chat las lee para explicarte."
          action={<NuevaNotaButtons materiaId={id} label="Empezar clase" size="lg" />}
        />
      ) : (
        <ClasesList materiaId={id} grupos={grupos} />
      )}
    </div>
  );
}
