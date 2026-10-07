import Link from "next/link";
import { getExamenes, getTemasForMateria } from "@/lib/db";
import { calculatePreparation } from "@/lib/mastery";
import {
  cuentaRegresiva,
  diasHasta,
  evaluacionNombre,
  evaluacionTipoLabel,
  fechaLarga,
  ordenarEvaluaciones,
} from "@/lib/evaluaciones";

export const dynamic = "force-dynamic";

export default async function ExamenesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [examenes, temas] = await Promise.all([getExamenes(id), getTemasForMateria(id)]);
  const ordenados = ordenarEvaluaciones(examenes);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 font-mono text-xs uppercase tracking-wider text-foreground-muted">Exámenes y entregas</div>
          <h2 className="font-serif text-3xl">Lo que se viene</h2>
          <p className="mt-1 max-w-xl text-sm text-foreground-muted">
            Parciales, finales y entregas de trabajos prácticos: cuándo son, de qué tratan y qué temas entran.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/materias/${id}/examenes/nuevo`} className="bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90">
            + Nuevo
          </Link>
          <Link
            href={`/materias/${id}/examen`}
            className="border border-border px-4 py-2 text-sm text-foreground-muted hover:border-accent hover:text-foreground"
          >
            Subir examen viejo
          </Link>
        </div>
      </div>

      {ordenados.length === 0 ? (
        <div className="border border-dashed border-border px-6 py-12 text-center">
          <p className="font-serif text-2xl">No cargaste exámenes ni entregas</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">
            Sin una fecha y unos temas no puedo decirte qué tan preparado estás. Cargá el próximo parcial o
            la próxima entrega.
          </p>
          <Link
            href={`/materias/${id}/examenes/nuevo`}
            className="mt-5 inline-flex bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90"
          >
            Cargar el próximo
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle border-y border-border-subtle">
          {ordenados.map((examen) => {
            const propios = temas.filter((t) => t.examenId === examen.id);
            const dias = diasHasta(examen.date);
            const pasado = dias !== null && dias < 0;
            return (
              <li key={examen.id}>
                <Link
                  href={`/materias/${id}/examenes/${examen.id}`}
                  className={`group grid gap-2 px-1 py-4 transition-colors hover:bg-surface sm:grid-cols-[140px_1fr_auto] sm:items-center sm:gap-6 sm:px-3 ${
                    pasado ? "opacity-60" : ""
                  }`}
                >
                  <div>
                    <div className="font-mono text-xs uppercase tracking-wider text-accent">{evaluacionTipoLabel(examen)}</div>
                    <div className="mt-0.5 text-sm text-foreground-muted">
                      {cuentaRegresiva(examen.date) ?? "Sin fecha"}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-base group-hover:text-accent">{evaluacionNombre(examen)}</div>
                    <div className="mt-0.5 truncate text-sm text-foreground-muted">
                      {[fechaLarga(examen.date), propios.length ? `${propios.length} temas` : "sin temas"]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  {propios.length > 0 && (
                    <div className="flex items-center gap-3 sm:w-40">
                      <div className="h-1 flex-1 bg-surface-elevated">
                        <div className="h-1 bg-accent" style={{ width: `${calculatePreparation(propios)}%` }} />
                      </div>
                      <span className="w-10 text-right font-mono text-xs text-foreground-muted">
                        {calculatePreparation(propios)}%
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
