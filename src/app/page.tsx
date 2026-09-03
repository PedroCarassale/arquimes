import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getMaterias, getExamenes, getTemas } from "@/lib/db";
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

function calculatePreparation(temas: { masteryState: MasteryState }[]): number {
  if (temas.length === 0) return 0;
  const weights: Record<MasteryState, number> = {
    no_estudiado: 0,
    empezado: 0.25,
    estudiado: 0.6,
    necesita_practica: 0.75,
    dominado: 1,
  };
  const sum = temas.reduce((acc, t) => acc + weights[t.masteryState], 0);
  return Math.round((sum / temas.length) * 100);
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
      const nextExamen = examenes
        .filter((e) => daysUntil(e.date) >= 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

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
          <div className="border border-border p-12 text-center">
            <p className="text-foreground-muted mb-6">
              No tenés materias todavía.
            </p>
            <Link
              href="/materias/nueva"
              className="inline-flex items-center gap-2 bg-accent text-background px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              + Crear materia
            </Link>
          </div>
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
                            {materia.nextExamen.type === "parcial" ? "Parcial" : "Final"}
                          </div>
                          <div className="text-sm text-foreground-muted">
                            {formatDate(materia.nextExamen.date)}
                          </div>
                        </>
                      ) : (
                        <span className="text-foreground-subtle text-sm">Sin fecha definida</span>
                      )}
                    </div>

                    <div className="text-center">
                      {materia.nextExamen ? (
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
