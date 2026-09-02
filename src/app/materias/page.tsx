import Link from "next/link";
import { getMaterias } from "@/lib/db";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default function MateriasPage() {
  const materias = getMaterias();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl sm:text-3xl">Tus materias</h1>
        {materias.length > 0 && (
          <Link href="/materias/nueva">
            <Button>Nueva materia</Button>
          </Link>
        )}
      </div>

      {materias.length === 0 ? (
        <EmptyState
          title="No tenés materias todavía"
          description="Creá tu primera materia para empezar a preparar tus exámenes."
          action={
            <Link href="/materias/nueva">
              <Button>Crear materia</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-1">
          {materias.map((materia) => (
            <Link
              key={materia.id}
              href={`/materias/${materia.id}`}
              className="block group"
            >
              <div className="py-4 px-4 -mx-4 border-b border-border-subtle hover:bg-surface-elevated transition-colors">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-serif text-lg group-hover:text-accent transition-colors">
                    {materia.name}
                  </h2>
                  {(materia.faculty || materia.catedra) && (
                    <span className="text-sm text-foreground-muted font-mono">
                      {[materia.faculty, materia.catedra]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
