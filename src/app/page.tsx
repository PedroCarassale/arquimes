import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { examDisplayName } from "@/lib/format";
import { getMaterias, getExamenes, getTemas } from "@/lib/db";
import { calculatePreparation } from "@/lib/mastery";
import { type MasteryState } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getMasteryDots(temas: { masteryState: MasteryState }[]): React.ReactNode {
  return (
    <div className="flex gap-0.5">
      {temas.slice(0, 10).map((t, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            t.masteryState === "dominado" || t.masteryState === "estudiado"
              ? "bg-accent"
              : t.masteryState === "empezado" || t.masteryState === "necesita_practica"
              ? "bg-foreground-muted"
              : "bg-foreground-subtle"
          }`}
        />
      ))}
    </div>
  );
}

export default async function HomePage() {
  const materias = await getMaterias();
  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const materiasWithData = await Promise.all(
    materias.map(async (materia) => {
      const examenes = await getExamenes(materia.id);
      const nextExamen = examenes[0];

      const temas = nextExamen ? await getTemas(nextExamen.id) : [];
      const preparation = calculatePreparation(temas);

      return {
        ...materia,
        nextExamen,
        temas,
        preparation,
      };
    })
  );

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <h1 className="font-serif text-4xl">Tus materias</h1>
          <div className="text-sm text-foreground-muted capitalize">{today}</div>
        </div>

        {materias.length === 0 ? (
          <section className="mx-auto max-w-4xl border border-border-subtle bg-surface/50 p-8 md:p-12 t-reveal-in">
            <div className="mb-10">
              <p className="text-xs font-mono uppercase tracking-[0.24em] text-foreground-muted">
                Primera noche en Arquimes
              </p>
              <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-tight md:text-5xl">
                Tu espacio para estudiar con foco, sin sentirte solo.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground-muted">
                Acá convertís apuntes sueltos en un plan claro para llegar al examen
                con más calma.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-mono uppercase tracking-[0.22em] text-foreground-muted">
                Cómo usarlo
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  "Subí tus apuntes y el material del examen.",
                  "Charlá con el tutor para destrabar temas difíciles.",
                  "Practicá pregunta por pregunta, tema por tema.",
                  "Medí qué tan preparado estás antes de rendir.",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="border border-border-subtle bg-background/40 p-4"
                  >
                    <p className="text-xs font-mono text-accent">
                      0{index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 border-t border-border-subtle pt-8">
              <Link
                href="/materias/nueva"
                aria-label="Agregar materia"
                className="inline-flex items-center justify-center bg-accent px-6 py-3 text-sm font-mono uppercase tracking-[0.12em] text-background transition-colors hover:bg-accent/90"
              >
                Agregar materia
              </Link>
              <p className="mt-3 text-sm text-foreground-muted">
                Empezá por una sola materia. El resto se va ordenando con vos.
              </p>
            </div>
          </section>
        ) : (
          <>
            <div className="border-b border-border-subtle mb-6">
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-mono text-foreground-muted uppercase tracking-wider">
                    <th className="text-left pb-3 font-normal">Materia / Cátedra</th>
                    <th className="text-left pb-3 font-normal">Próximo examen</th>
                    <th className="text-center pb-3 font-normal">Falta</th>
                    <th className="text-center pb-3 font-normal">Preparado</th>
                    <th className="text-right pb-3 font-normal">Siguiente acción</th>
                  </tr>
                </thead>
              </table>
            </div>

            <div className="space-y-0">
              {materiasWithData.map((materia) => (
                <Link
                  key={materia.id}
                  href={`/materias/${materia.id}`}
                  className="block border-b border-border-subtle py-5 hover:bg-surface transition-colors -mx-4 px-4"
                >
                  <div className="grid grid-cols-[1fr_200px_80px_100px_200px] gap-4 items-center">
                    <div>
                      <div className="font-serif text-xl mb-1">{materia.name}</div>
                      <div className="text-sm text-foreground-muted">
                        {[materia.faculty, materia.catedra].filter(Boolean).join(" · ") || "Sin cátedra"}
                      </div>
                    </div>

                    <div>
                      {materia.nextExamen ? (
                        <>
                          <div className="text-accent text-sm">
                            {examDisplayName(materia.nextExamen)}
                          </div>
                          <div className="text-sm text-foreground-muted">
                            {materia.nextExamen.fileName ||
                              (materia.nextExamen.date
                                ? formatDate(materia.nextExamen.date)
                                : "Sin fecha")}
                          </div>
                        </>
                      ) : (
                        <span className="text-foreground-subtle text-sm">Sin fecha definida</span>
                      )}
                    </div>

                    <div className="text-center">
                      {materia.nextExamen?.date ? (
                        <>
                          <div className="text-2xl font-serif">
                            {daysUntil(materia.nextExamen.date)}
                          </div>
                          <div className="text-xs text-foreground-muted">días</div>
                        </>
                      ) : (
                        <span className="text-foreground-subtle">—</span>
                      )}
                    </div>

                    <div className="text-center">
                      {materia.temas.length > 0 ? (
                        <>
                          <div className="text-2xl font-serif">{materia.preparation}%</div>
                          {getMasteryDots(materia.temas)}
                        </>
                      ) : (
                        <span className="text-foreground-subtle">—</span>
                      )}
                    </div>

                    <div className="text-right">
                      {!materia.nextExamen ? (
                        <span className="text-accent text-sm">Cargar examen →</span>
                      ) : materia.temas.length === 0 ? (
                        <span className="text-accent text-sm">Agregar temas →</span>
                      ) : materia.preparation === 0 ? (
                        <span className="text-accent text-sm">Practicar →</span>
                      ) : materia.preparation < 100 ? (
                        <span className="text-accent text-sm">Continuar preparación →</span>
                      ) : (
                        <span className="text-accent text-sm">Listo para rendir</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/materias/nueva"
                className="text-accent text-sm hover:underline"
              >
                + Crear materia
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
