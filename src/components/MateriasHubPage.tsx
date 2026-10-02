import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { examDisplayName } from "@/lib/format";
import { getMaterias, getExamenes, getTemas } from "@/lib/db";
import { calculatePreparation } from "@/lib/mastery";
import { type MasteryState } from "@/lib/types";
import { RememberMaterias } from "@/lib/materia-snapshot";

type MateriasHubMode = "inicio" | "selector-chat";

interface MateriasHubPageProps {
  mode?: MateriasHubMode;
}

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
    <div className="flex justify-end gap-0.5 lg:justify-center">
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

export async function MateriasHubPage({ mode = "inicio" }: MateriasHubPageProps) {
  const materias = await getMaterias();
  const isChatPicker = mode === "selector-chat";
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
      <RememberMaterias
        items={materiasWithData.map((materia) => ({
          id: materia.id,
          snapshot: {
            name: materia.name,
            info: [materia.faculty, materia.catedra].filter(Boolean).join(" · ") || "Privada",
            resumenVariant: !materia.nextExamen
              ? "sin_examen"
              : materia.temas.length === 0
                ? "sin_temas"
                : "con_temas",
            temasCount: materia.temas.length,
          },
        }))}
      />
      <div className="px-4 py-6 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-1 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
            {isChatPicker ? "Elegí una materia para chatear" : "Tus materias"}
          </h1>
          <div className="text-sm text-foreground-muted capitalize">{today}</div>
        </div>

        {materias.length === 0 ? (
          <section className="t-reveal-in mx-auto max-w-4xl border border-border-subtle bg-surface/50 p-5 sm:p-8 md:p-12">
            <div className="mb-8 sm:mb-10">
              <p className="text-xs font-mono uppercase tracking-[0.24em] text-foreground-muted">
                Primera noche en Arquimes
              </p>
              <h2 className="mt-3 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl md:text-5xl">
                {isChatPicker
                  ? "Cada chat empieza con una materia."
                  : "Tu espacio para estudiar con foco, sin sentirte solo."}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground-muted">
                {isChatPicker
                  ? "Creá tu primera materia y después vas a poder abrir su chat de estudio."
                  : "Acá convertís apuntes sueltos en un plan claro para llegar al examen con más calma."}
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
                    <p className="text-xs font-mono text-accent">0{index + 1}</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-border-subtle pt-6 sm:mt-10 sm:pt-8">
              <Link
                href="/materias/nueva"
                aria-label="Agregar materia"
                className="inline-flex w-full items-center justify-center bg-accent px-6 py-3 sm:w-auto text-sm font-mono uppercase tracking-[0.12em] text-background transition-colors hover:bg-accent/90"
              >
                Agregar materia
              </Link>
              <p className="mt-3 text-sm text-foreground-muted">
                {isChatPicker
                  ? "Creala y abrimos el chat de estudio desde ahí."
                  : "Empezá por una sola materia. El resto se va ordenando con vos."}
              </p>
            </div>
          </section>
        ) : (
          <>
            {isChatPicker && (
              <p className="mb-6 text-sm text-foreground-muted">
                Cada chat pertenece a una materia. Elegí una para abrir su espacio de chat.
              </p>
            )}

            <div className="mb-6 hidden border-b border-border-subtle lg:block">
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                    <th className="pb-3 text-left font-normal">Materia / Cátedra</th>
                    <th className="pb-3 text-left font-normal">Próximo examen</th>
                    <th className="pb-3 text-center font-normal">Falta</th>
                    <th className="pb-3 text-center font-normal">Preparado</th>
                    <th className="pb-3 text-right font-normal">
                      {isChatPicker ? "Abrir chat" : "Siguiente acción"}
                    </th>
                  </tr>
                </thead>
              </table>
            </div>

            <div className="space-y-0">
              {materiasWithData.map((materia) => (
                <Link
                  key={materia.id}
                  href={isChatPicker ? `/materias/${materia.id}/chat` : `/materias/${materia.id}`}
                  className="mx-[-1rem] block border-b border-border-subtle px-4 py-4 transition-colors hover:bg-surface lg:py-5"
                >
                  <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 lg:grid-cols-[1fr_200px_80px_100px_200px] lg:gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 font-serif text-xl leading-tight">{materia.name}</div>
                      <div className="text-sm text-foreground-muted">
                        {[materia.faculty, materia.catedra].filter(Boolean).join(" · ") || "Sin cátedra"}
                      </div>
                    </div>

                    <div className="order-3 min-w-0 lg:order-none">
                      {materia.nextExamen ? (
                        <>
                          <div className="text-sm text-accent">{examDisplayName(materia.nextExamen)}</div>
                          <div className="truncate text-sm text-foreground-muted">
                            {materia.nextExamen.fileName ||
                              (materia.nextExamen.date
                                ? formatDate(materia.nextExamen.date)
                                : "Sin fecha")}
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-foreground-subtle">Sin fecha definida</span>
                      )}
                    </div>

                    <div className="order-4 text-right lg:order-none lg:text-center">
                      {materia.nextExamen?.date ? (
                        <>
                          <div className="font-serif text-2xl">{daysUntil(materia.nextExamen.date)}</div>
                          <div className="text-xs text-foreground-muted">días</div>
                        </>
                      ) : (
                        <span className="text-foreground-subtle max-lg:hidden">—</span>
                      )}
                    </div>

                    <div className="text-right lg:text-center">
                      {materia.temas.length > 0 ? (
                        <>
                          <div className="font-serif text-2xl">{materia.preparation}%</div>
                          {getMasteryDots(materia.temas)}
                        </>
                      ) : (
                        <span className="text-foreground-subtle max-lg:hidden">—</span>
                      )}
                    </div>

                    <div className="order-5 col-span-2 lg:order-none lg:col-span-1 lg:text-right">
                      {isChatPicker ? (
                        <span className="text-sm text-accent">Abrir chat →</span>
                      ) : !materia.nextExamen ? (
                        <span className="text-sm text-accent">Cargar examen →</span>
                      ) : materia.temas.length === 0 ? (
                        <span className="text-sm text-accent">Agregar temas →</span>
                      ) : materia.preparation === 0 ? (
                        <span className="text-sm text-accent">Practicar →</span>
                      ) : materia.preparation < 100 ? (
                        <span className="text-sm text-accent">Continuar preparación →</span>
                      ) : (
                        <span className="text-sm text-accent">Listo para rendir</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8">
              <Link href="/materias/nueva" className="text-sm text-accent hover:underline">
                + Crear materia
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
