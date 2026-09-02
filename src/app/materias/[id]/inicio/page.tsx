import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getMateria, getMateriales, getExamenes } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MateriaInicioPage({ params }: PageProps) {
  const { id } = await params;
  const materia = getMateria(id);

  if (!materia) {
    notFound();
  }

  const materiales = getMateriales(id);
  const examenes = getExamenes(id);

  const hasContent = materiales.length > 0 || examenes.length > 0;
  if (hasContent) {
    redirect(`/materias/${id}`);
  }

  const steps = [
    {
      number: "01",
      label: "Recomendado",
      title: "Cargar el programa",
      description: "Organiza unidades y temas para que Arquimes entienda la materia.",
      action: "Empezar →",
      href: "#",
      disabled: true,
    },
    {
      number: "02",
      title: "Agregar material",
      description: "Subí apuntes, guías, bibliografía o imágenes.",
      action: "Cargar →",
      href: `/materias/${id}/cargar`,
      disabled: false,
    },
    {
      number: "03",
      title: "Preparar un examen",
      description: "Indicá una fecha y generá un plan de estudio.",
      action: "Crear →",
      href: `/materias/${id}/examen`,
      disabled: false,
    },
    {
      number: "04",
      title: "Invitar personas",
      description: "Compartí la materia con compañeros.",
      action: "Invitar →",
      href: "#",
      disabled: true,
    },
  ];

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider">
            Primeros pasos
          </div>
          <Link
            href={`/materias/${id}`}
            className="text-xs font-mono text-foreground-muted uppercase tracking-wider border border-border px-3 py-1 hover:bg-surface transition-colors"
          >
            Estado vacío
          </Link>
        </div>

        <h1 className="font-serif text-3xl mb-8">Tu materia está lista</h1>

        <div className="mb-4">
          <div className="text-accent text-sm uppercase tracking-wider mb-1">
            {materia.name}
          </div>
          <h2 className="font-serif text-2xl mb-2">Construyamos tu espacio de estudio</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-muted">
              Podés empezar por cualquiera de estos pasos.
            </p>
            <span className="text-xs font-mono text-foreground-muted">
              0 de 4 completados
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-12">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`border p-6 flex flex-col ${
                i === 0 ? "border-accent" : "border-border-subtle"
              } ${step.disabled ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-mono ${i === 0 ? "text-accent" : "text-foreground-muted"}`}>
                  {step.number}
                </span>
                {step.label && (
                  <span className="text-xs font-mono text-accent">· {step.label}</span>
                )}
              </div>

              <h3 className="font-serif text-lg mb-3">{step.title}</h3>
              <p className="text-sm text-foreground-muted mb-6 flex-1">
                {step.description}
              </p>

              {step.disabled ? (
                <span className="text-xs font-mono text-foreground-subtle uppercase">
                  Próximamente
                </span>
              ) : (
                <Link
                  href={step.href}
                  className="text-accent text-sm uppercase tracking-wider hover:underline"
                >
                  {step.action}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border-subtle pt-6">
          <p className="text-sm text-foreground-muted">
            También podés explorar la materia y volver a estos pasos después.
          </p>
          <Link
            href={`/materias/${id}`}
            className="text-sm border border-border px-4 py-2 hover:bg-surface transition-colors"
          >
            Ir al resumen →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
