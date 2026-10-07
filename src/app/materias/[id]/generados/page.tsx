import Link from "next/link";
import { listArtefactos } from "@/lib/workspace-store";
import { PedirAlChat } from "@/components/workspace/PedirAlChat";

export const dynamic = "force-dynamic";

const PEDIDOS = [
  "Armame un simulacro del próximo examen, con opción múltiple y desarrollo.",
  "Hacé una guía de estudio con los temas del próximo examen.",
  "Armame un resumen de mis notas de clase.",
  "Hacé un cuadro comparativo de los conceptos que más se confunden.",
];

export default async function GeneradosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artefactos = await listArtefactos(id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <div className="mb-8">
        <div className="mb-1 font-mono text-xs uppercase tracking-wider text-foreground-muted">Generados</div>
        <h2 className="font-serif text-3xl">Exámenes y documentos del chat</h2>
        <p className="mt-1 max-w-xl text-sm text-foreground-muted">
          Pedile al chat un examen de práctica, un resumen o una guía y aparece acá. Si le pedís cambios,
          guarda una versión nueva.
        </p>
      </div>

      {artefactos.length === 0 ? (
        <div className="border border-dashed border-border px-6 py-10">
          <p className="font-serif text-2xl">Todavía no generaste nada</p>
          <p className="mt-2 text-sm text-foreground-muted">Probá con alguno de estos pedidos:</p>
          <div className="mt-4 flex flex-col gap-2">
            {PEDIDOS.map((pedido) => (
              <PedirAlChat key={pedido} texto={pedido} />
            ))}
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {artefactos.map((a) => (
            <li key={a.id}>
              <Link
                href={`/materias/${id}/generados/${a.id}`}
                className="group flex h-full flex-col border border-border-subtle p-4 transition-colors hover:border-accent"
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                  {a.tipo === "examen" ? "Examen interactivo" : "Documento"} · v{a.version}
                </span>
                <span className="mt-2 font-serif text-xl leading-tight group-hover:text-accent">{a.titulo}</span>
                <span className="mt-auto pt-3 font-mono text-[10px] text-foreground-muted">
                  {new Date(a.updatedAt).toLocaleString("es-AR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
