import Link from "next/link";
import { listNotas } from "@/lib/workspace-store";
import { NuevaNotaButtons } from "@/components/workspace/NuevaNotaButtons";

export const dynamic = "force-dynamic";

export default async function NotasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notas = await listNotas(id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 font-mono text-xs uppercase tracking-wider text-foreground-muted">Notas</div>
          <h2 className="font-serif text-3xl">Tus apuntes de clase</h2>
          <p className="mt-1 max-w-xl text-sm text-foreground-muted">
            Cada clase, una nota en Markdown. El chat las lee para explicarte y armarte exámenes.
          </p>
        </div>
        <NuevaNotaButtons materiaId={id} />
      </div>

      {notas.length === 0 ? (
        <div className="border border-dashed border-border px-6 py-12 text-center">
          <p className="font-serif text-2xl">Todavía no escribiste notas</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">
            Arrancó una clase: tocá «Nueva clase» y anotá a medida que avanza. Podés usar títulos,
            listas y fórmulas.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle border-y border-border-subtle">
          {notas.map((nota) => (
            <li key={nota.id}>
              <Link
                href={`/materias/${id}/notas/${nota.id}`}
                className="group flex flex-col gap-1 px-1 py-4 transition-colors hover:bg-surface sm:flex-row sm:items-baseline sm:gap-6 sm:px-3"
              >
                <span className="w-28 shrink-0 font-mono text-xs text-foreground-muted">
                  {new Date(nota.updatedAt).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base group-hover:text-accent">{nota.titulo}</span>
                  <span className="mt-0.5 block truncate text-sm text-foreground-muted">
                    {extracto(nota.contenido) || "Vacía"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function extracto(markdown: string): string {
  return markdown
    .replace(/[#>*_`$\-[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}
