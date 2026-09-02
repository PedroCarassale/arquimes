"use client";

import { Material, ExamenEnPreparacion, Tema, MASTERY_LABELS, MasteryState } from "@/lib/types";

interface ExamenWithTemas extends ExamenEnPreparacion {
  temas: Tema[];
}

interface ReadinessPanelProps {
  materiaId: string;
  materiales: Material[];
  examenes: ExamenWithTemas[];
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
      return "bg-accent";
    case "estudiado":
      return "bg-accent/60";
    case "necesita_practica":
      return "bg-amber-600";
    case "empezado":
      return "bg-foreground-muted/40";
    default:
      return "bg-foreground-muted/20";
  }
}

export function ReadinessPanel({
  materiaId,
  materiales,
  examenes,
}: ReadinessPanelProps) {
  const nextExamen = examenes
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const hasMateriales = materiales.length > 0;
  const hasExamen = !!nextExamen;
  const hasTemas = hasExamen && nextExamen.temas.length > 0;

  if (!hasExamen) {
    return (
      <div className="border border-border p-6 bg-surface">
        <p className="text-foreground-muted text-lg mb-4">
          No tenés ningún examen cargado para esta materia.
        </p>
        <p className="text-foreground-muted">
          {hasMateriales
            ? "Ya tenés material subido. Cargá un examen para empezar a prepararte."
            : "Empezá subiendo tu material de estudio y después cargá tu próximo examen."}
        </p>
        <div className="mt-4 text-sm text-foreground-muted/70 font-mono">
          Siguiente paso →{" "}
          <span className="text-foreground">
            {hasMateriales ? "Cargar examen" : "Subir material"}
          </span>
        </div>
      </div>
    );
  }

  const days = daysUntil(nextExamen.date);
  const examLabel = nextExamen.type === "parcial" ? "Parcial" : "Final";

  if (!hasTemas) {
    return (
      <div className="border border-border p-6 bg-surface">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif text-xl">
            {examLabel} — {formatDate(nextExamen.date)}
          </h2>
          <span className="font-mono text-accent">
            {days === 0 ? "Hoy" : days === 1 ? "Mañana" : `${days} días`}
          </span>
        </div>
        <p className="text-foreground-muted text-lg mb-4">
          No tenés temas cargados para este examen.
        </p>
        <p className="text-foreground-muted">
          Agregá los temas que entran para poder hacer un seguimiento de tu preparación.
        </p>
        <div className="mt-4 text-sm text-foreground-muted/70 font-mono">
          Siguiente paso →{" "}
          <span className="text-foreground">Agregar temas</span>
        </div>
      </div>
    );
  }

  const temasCount = nextExamen.temas.length;
  const dominados = nextExamen.temas.filter((t) => t.masteryState === "dominado").length;
  const estudiados = nextExamen.temas.filter((t) => t.masteryState === "estudiado").length;
  const noEstudiados = nextExamen.temas.filter((t) => t.masteryState === "no_estudiado").length;

  const progress = Math.round(((dominados * 1.0 + estudiados * 0.6) / temasCount) * 100);

  return (
    <div className="border border-border p-6 bg-surface">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-serif text-xl">
          {examLabel} — {formatDate(nextExamen.date)}
        </h2>
        <span className="font-mono text-accent">
          {days === 0 ? "Hoy" : days === 1 ? "Mañana" : `${days} días`}
        </span>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-foreground-muted text-sm">Preparación</span>
          <span className="font-mono text-2xl text-foreground">{progress}%</span>
        </div>
        <div className="h-2 bg-surface-elevated flex gap-0.5 overflow-hidden">
          {nextExamen.temas.map((tema) => (
            <div
              key={tema.id}
              className={`flex-1 ${getMasteryColor(tema.masteryState)}`}
              title={`${tema.name}: ${MASTERY_LABELS[tema.masteryState]}`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center font-mono text-sm border-t border-border-subtle pt-4">
        <div>
          <div className="text-2xl text-foreground">{dominados}</div>
          <div className="text-foreground-muted">dominados</div>
        </div>
        <div>
          <div className="text-2xl text-foreground">{estudiados}</div>
          <div className="text-foreground-muted">estudiados</div>
        </div>
        <div>
          <div className="text-2xl text-foreground">{noEstudiados}</div>
          <div className="text-foreground-muted">sin ver</div>
        </div>
      </div>

      {noEstudiados > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle text-sm text-foreground-muted">
          {noEstudiados === temasCount
            ? "Todavía no empezaste con ningún tema. Elegí uno y empezá a estudiar."
            : `Te faltan ${noEstudiados} tema${noEstudiados > 1 ? "s" : ""} por ver.`}
        </div>
      )}

      {noEstudiados === 0 && dominados < temasCount && (
        <div className="mt-4 pt-4 border-t border-border-subtle text-sm text-foreground-muted">
          Buen progreso. Seguí practicando los temas que no dominás todavía.
        </div>
      )}

      {dominados === temasCount && (
        <div className="mt-4 pt-4 border-t border-border-subtle text-sm text-accent">
          ¡Dominás todos los temas! Estás listo para rendir.
        </div>
      )}
    </div>
  );
}
