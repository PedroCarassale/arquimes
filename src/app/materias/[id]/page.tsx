import { notFound } from "next/navigation";
import Link from "next/link";
import { MateriaLayout } from "@/components/MateriaLayout";
import { getMateria, getMateriales, getExamenes, getTemas } from "@/lib/db";
import { examDisplayName } from "@/lib/format";
import { calculatePreparation } from "@/lib/mastery";
import { MASTERY_LABELS, type MasteryState } from "@/lib/types";
import { materialViewerRoute } from "@/lib/material-viewer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
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

function getMasteryColor(state: MasteryState): string {
  switch (state) {
    case "dominado":
      return "text-accent";
    case "estudiado":
      return "text-accent/70";
    case "necesita_practica":
      return "text-amber-500";
    case "empezado":
      return "text-foreground-muted";
    default:
      return "text-foreground-subtle";
  }
}

export default async function MateriaResumenPage({ params }: PageProps) {
  const { id } = await params;
  const materia = await getMateria(id);

  if (!materia) {
    notFound();
  }

  const materiales = await getMateriales(id);
  const examenes = await getExamenes(id);
  const nextExamen = examenes[0];

  const temas = nextExamen ? await getTemas(nextExamen.id) : [];
  const preparation = calculatePreparation(temas);
  const temasCount = temas.length;
  const temasCubiertos = temas.filter(
    (t) => t.masteryState !== "no_estudiado"
  ).length;
  const preparacion = materia.preparacion;
  const hasPreparacionConfig = Boolean(
    preparacion?.fechaParcial && preparacion.temas.length > 0
  );

  const materiaInfo = [materia.faculty, materia.catedra].filter(Boolean).join(" · ");

  const noExam = !nextExamen;
  const noTopics = nextExamen && temas.length === 0;
  const hasData = nextExamen && temas.length > 0;

  return (
    <MateriaLayout
      materiaId={id}
      materiaName={materia.name}
      materiaInfo={materiaInfo || "Privada"}
    >
      {!hasPreparacionConfig ? (
        <div className="mb-8 border border-dashed border-border-subtle p-4">
          <p className="text-sm text-foreground-muted">
            Si querés organizarte con anticipación, configurá temas y fecha del parcial en{" "}
            <Link href={`/materias/${id}/preparacion`} className="text-accent hover:underline">
              Preparación
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mb-8 border border-border-subtle p-4">
          <p className="text-sm text-foreground-muted">
            Preparación configurada: {preparacion?.temas.length || 0} temas · parcial{" "}
            {preparacion?.fechaParcial ? formatDate(preparacion.fechaParcial) : "sin fecha"}.
            {preparacion?.plan ? " Ya tenés un plan generado." : " Podés generar tu plan cuando quieras."}
          </p>
        </div>
      )}

      {noExam && (
        <div className="border border-border-subtle p-8 text-center">
          <p className="text-foreground-muted mb-4">
            No tenés ningún examen cargado para esta materia.
          </p>
          <p className="text-sm text-foreground-subtle mb-6">
            {materiales.length > 0
              ? "Ya tenés material subido. Cargá un examen para empezar a prepararte."
              : "Empezá subiendo tu material de estudio y después cargá tu próximo examen."}
          </p>
          <div className="flex items-center justify-center gap-4">
            {materiales.length === 0 && (
              <Link
                href={`/materias/${id}/cargar`}
                className="text-accent text-sm hover:underline"
              >
                Subir material →
              </Link>
            )}
            <Link
              href={`/materias/${id}/examen`}
              className="bg-accent text-background px-4 py-2 text-sm hover:bg-accent/90 transition-colors"
            >
              Cargar examen →
            </Link>
          </div>
        </div>
      )}

      {noTopics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="border border-accent p-6">
              <div className="text-xs font-mono text-accent uppercase tracking-wider mb-2">
                Próximo examen
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-serif text-xl">
                    {examDisplayName(nextExamen)}
                  </div>
                  <div className="text-sm text-foreground-muted">
                    {nextExamen.fileName ||
                      (nextExamen.date
                        ? formatDate(nextExamen.date)
                        : "Archivo de examen")}
                  </div>
                </div>
                <div className="text-right">
                  {nextExamen.date ? (
                    <>
                      <div className="text-3xl font-serif">
                        {daysUntil(nextExamen.date)}
                      </div>
                      <div className="text-xs font-mono text-foreground-muted">
                        días
                      </div>
                    </>
                  ) : (
                    <Link
                      href={
                        nextExamen.materialId
                          ? materialViewerRoute({
                              materiaId: id,
                              materialId: nextExamen.materialId,
                              volver: `/materias/${id}`,
                              etiqueta: "Volver al resumen",
                            })
                          : `/materias/${id}/examenes/${nextExamen.id}`
                      }
                      className="text-accent text-sm hover:underline"
                    >
                      Ver archivo online →
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {hasPreparacionConfig ? (
              <div className="border border-border-subtle p-6">
                <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                  Preparación estimada
                </div>
                <div className="text-3xl font-serif">—</div>
                <div className="text-sm text-foreground-muted">Sin temas de práctica cargados</div>
              </div>
            ) : (
              <div className="border border-border-subtle p-6">
                <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                  Plan de estudio
                </div>
                <p className="text-sm text-foreground-muted mb-3">
                  Configurá temas y fecha del parcial para generar tu plan.
                </p>
                <Link
                  href={`/materias/${id}/preparacion`}
                  className="text-accent text-sm hover:underline"
                >
                  Configurar preparación →
                </Link>
              </div>
            )}

            <div className="border border-border-subtle p-6">
              <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                Siguiente paso
              </div>
              <p className="text-sm text-foreground-muted mb-4">
                El archivo ya está. Agregá los temas que entran para poder
                practicar y ver el preparado.
              </p>
              <Link
                href={`/materias/${id}/examenes/${nextExamen.id}`}
                className="text-accent text-sm hover:underline"
              >
                Agregar temas →
              </Link>
              <p className="text-xs text-foreground-muted mt-3">
                Cuando completes los temas, abrí{" "}
                <Link href={`/materias/${id}/chat`} className="text-accent hover:underline">
                  Chat
                </Link>{" "}
                para pedir resumen o plan de estudio.
              </p>
            </div>
          </div>
        </>
      )}

      {hasData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="border border-accent p-6">
              <div className="text-xs font-mono text-accent uppercase tracking-wider mb-2">
                Próximo examen
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-serif text-xl">
                    {examDisplayName(nextExamen)}
                  </div>
                  <div className="text-sm text-foreground-muted">
                    {nextExamen.fileName ||
                      (nextExamen.date
                        ? formatDate(nextExamen.date)
                        : "Archivo de examen")}
                  </div>
                </div>
                <div className="text-right">
                  {nextExamen.date ? (
                    <>
                      <div className="text-3xl font-serif">
                        {daysUntil(nextExamen.date)}
                      </div>
                      <div className="text-xs font-mono text-foreground-muted">
                        días
                      </div>
                    </>
                  ) : (
                    <Link
                      href={
                        nextExamen.materialId
                          ? materialViewerRoute({
                              materiaId: id,
                              materialId: nextExamen.materialId,
                              volver: `/materias/${id}`,
                              etiqueta: "Volver al resumen",
                            })
                          : `/materias/${id}/examenes/${nextExamen.id}`
                      }
                      className="text-accent text-sm hover:underline"
                    >
                      Ver archivo online →
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {hasPreparacionConfig ? (
              <div className="border border-border-subtle p-6">
                <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                  Preparación estimada
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-serif">{preparation}%</span>
                  <span className="text-sm text-foreground-muted">
                    {preparation === 0 ? "sin práctica" : "en curso"}
                  </span>
                </div>
                <div className="text-sm text-foreground-muted mt-1">
                  {preparation === 0
                    ? "Todavía no hay práctica que mueva este número"
                    : `${temasCubiertos} de ${temasCount} temas cubiertos`}
                </div>
              </div>
            ) : (
              <div className="border border-border-subtle p-6">
                <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                  Plan de estudio
                </div>
                <p className="text-sm text-foreground-muted mb-3">
                  Este resumen evita forzar un plan hasta que vos lo configures.
                </p>
                <Link
                  href={`/materias/${id}/preparacion`}
                  className="text-accent text-sm hover:underline"
                >
                  Configurar preparación →
                </Link>
              </div>
            )}

            <div className="border border-accent-muted p-6 bg-accent-muted/30">
              <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                Siguiente paso recomendado
              </div>
              {temas.filter((t) => t.masteryState === "no_estudiado").length > 0 ? (
                <>
                  <div className="font-serif text-lg mb-1">
                    Empezar con {temas.find((t) => t.masteryState === "no_estudiado")?.name}
                  </div>
                  <p className="text-sm text-foreground-muted mb-3">
                    Tema sin estudiar
                  </p>
                </>
              ) : temas.filter((t) => t.masteryState === "necesita_practica").length > 0 ? (
                <>
                  <div className="font-serif text-lg mb-1">
                    Practicar {temas.find((t) => t.masteryState === "necesita_practica")?.name}
                  </div>
                  <p className="text-sm text-foreground-muted mb-3">
                    Necesita más práctica
                  </p>
                </>
              ) : (
                <>
                  <div className="font-serif text-lg mb-1">
                    Seguir practicando
                  </div>
                  <p className="text-sm text-foreground-muted mb-3">
                    Mantené el ritmo de estudio
                  </p>
                </>
              )}
              <Link
                href={`/materias/${id}/practica`}
                className="text-accent text-sm hover:underline"
              >
                Practicar ahora →
              </Link>
              <p className="text-xs text-foreground-muted mt-3">
                También podés abrir{" "}
                <Link href={`/materias/${id}/chat`} className="text-accent hover:underline">
                  Chat
                </Link>{" "}
                para repasar por tema o simular examen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl">Programa y temas</h2>
                <Link
                  href={`/materias/${id}/examenes/${nextExamen.id}`}
                  className="text-xs font-mono text-accent uppercase tracking-wider hover:underline"
                >
                  Ver examen →
                </Link>
              </div>
              <p className="text-sm text-foreground-muted mb-4">
                {temasCubiertos} cubiertos · {temas.filter((t) => t.masteryState === "necesita_practica").length} necesitan práctica · {temas.filter((t) => t.masteryState === "no_estudiado").length} sin empezar
              </p>

              <div className="border border-border-subtle divide-y divide-border-subtle">
                {temas.map((tema) => {
                  const weights: Record<MasteryState, number> = {
                    no_estudiado: 0,
                    empezado: 25,
                    estudiado: 60,
                    necesita_practica: 75,
                    dominado: 100,
                  };
                  const progress = weights[tema.masteryState];

                  return (
                    <div key={tema.id} className="p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-sm">{tema.name}</div>
                      </div>
                      <div className={`text-xs font-mono uppercase ${getMasteryColor(tema.masteryState)}`}>
                        {MASTERY_LABELS[tema.masteryState]}
                      </div>
                      <div className="w-24 h-1 bg-surface-elevated">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg">Apuntes y material</h3>
                  <Link
                    href={`/materias/${id}/cargar`}
                    className="text-accent text-sm border border-accent px-3 py-1 hover:bg-accent hover:text-background transition-colors"
                  >
                    Cargar apuntes
                  </Link>
                </div>
                {materiales.length === 0 ? (
                  <p className="text-sm text-foreground-muted">
                    No hay material subido todavía.
                  </p>
                ) : (
                  <div className="border border-border-subtle divide-y divide-border-subtle">
                    {materiales.slice(0, 3).map((material) => (
                      <Link
                        key={material.id}
                        href={materialViewerRoute({
                          materiaId: id,
                          materialId: material.id,
                          volver: `/materias/${id}`,
                          etiqueta: "Volver al resumen",
                        })}
                        className="p-3 flex items-center gap-3 hover:bg-surface transition-colors"
                      >
                        <span className="text-xs font-mono text-foreground-muted w-8">
                          {material.type.includes("pdf") ? "PDF" : material.type.includes("image") ? "IMG" : "DOC"}
                        </span>
                        <span className="flex-1 text-sm truncate">{material.name}</span>
                        <span className="text-xs text-accent">Ver →</span>
                      </Link>
                    ))}
                    {materiales.length > 3 && (
                      <Link
                        href={`/materias/${id}/apuntes`}
                        className="block p-3 text-sm text-foreground-muted hover:text-foreground transition-colors"
                      >
                        Ver todos →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </MateriaLayout>
  );
}
