"use client";

import { MateriaLayoutSkeleton } from "@/components/MateriaLayoutSkeleton";
import { Bone, BoneBlock } from "@/components/Skeleton";
import type { MateriaSnapshot } from "@/lib/materia-snapshot";

function ExamCard() {
  return (
    <div className="border border-accent p-6">
      <div className="text-xs font-mono text-accent uppercase tracking-wider mb-2">
        Próximo examen
      </div>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="font-serif text-xl">
            <Bone className="w-36" />
          </div>
          <div className="text-sm text-foreground-muted">
            <Bone className="w-28" />
          </div>
        </div>
        <div className="text-right text-sm">
          <Bone className="w-28" />
        </div>
      </div>
    </div>
  );
}

function PlanCard({ variant }: { variant: "sin_temas" | "con_temas" }) {
  return (
    <div className="border border-border-subtle p-6">
      <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
        Plan de estudio
      </div>
      <p className="text-sm text-foreground-muted mb-3">
        {variant === "con_temas"
          ? "Este resumen evita forzar un plan hasta que vos lo configures."
          : "Configurá temas y fecha del parcial para generar tu plan."}
      </p>
      <span className="text-accent text-sm">Configurar preparación →</span>
    </div>
  );
}

function PreparacionCard() {
  return (
    <div className="border border-border-subtle p-6">
      <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
        Preparación estimada
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-serif">
          <Bone className="w-14" />
        </span>
        <span className="text-sm text-foreground-muted">
          <Bone className="w-16" />
        </span>
      </div>
      <div className="text-sm text-foreground-muted mt-1">
        <Bone className="w-48" />
      </div>
    </div>
  );
}

function SiguientePasoCard() {
  return (
    <div className="border border-border-subtle p-6">
      <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
        Siguiente paso
      </div>
      <p className="text-sm text-foreground-muted mb-4">
        El archivo ya está. Agregá los temas que entran para poder
        practicar y ver el preparado.
      </p>
      <span className="text-accent text-sm">Agregar temas →</span>
      <p className="text-xs text-foreground-muted mt-3">
        Cuando completes los temas, abrí <span className="text-accent">Chat</span> para
        pedir resumen o plan de estudio.
      </p>
    </div>
  );
}

function RecomendadoCard() {
  return (
    <div className="border border-accent-muted p-6 bg-accent-muted/30">
      <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
        Siguiente paso recomendado
      </div>
      <div className="font-serif text-lg mb-1">
        <Bone className="w-56" />
      </div>
      <p className="text-sm text-foreground-muted mb-3">
        <Bone className="w-28" />
      </p>
      <span className="text-accent text-sm">Practicar ahora →</span>
      <p className="text-xs text-foreground-muted mt-3">
        También podés abrir <span className="text-accent">Chat</span> para repasar por
        tema o simular examen.
      </p>
    </div>
  );
}

function SinExamen({ snapshot }: { snapshot: MateriaSnapshot }) {
  return (
    <div className="border border-border-subtle p-8 text-center">
      <p className="text-foreground-muted mb-4">
        No tenés ningún examen cargado para esta materia.
      </p>
      <p className="text-sm text-foreground-subtle mb-6">
        <Bone className="w-96" />
      </p>
      <div className="flex items-center justify-center gap-4">
        {!snapshot.materialesCount && (
          <span className="text-accent text-sm">Subir material →</span>
        )}
        <span className="bg-accent text-background px-4 py-2 text-sm">
          Cargar examen →
        </span>
      </div>
    </div>
  );
}

function ConTemas({ snapshot }: { snapshot: MateriaSnapshot }) {
  const temas = Math.min(Math.max(snapshot.temasCount ?? 4, 1), 12);
  const materiales = snapshot.materialesCount ?? 3;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl">Programa y temas</h2>
          <span className="text-xs font-mono text-accent uppercase tracking-wider">
            Ver examen →
          </span>
        </div>
        <p className="text-sm text-foreground-muted mb-4">
          <Bone className="w-72" />
        </p>
        <div className="border border-border-subtle divide-y divide-border-subtle">
          {Array.from({ length: temas }, (_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm">
                  <Bone className={i % 3 === 0 ? "w-56" : i % 3 === 1 ? "w-44" : "w-64"} />
                </div>
              </div>
              <div className="text-xs font-mono uppercase">
                <Bone className="w-20" />
              </div>
              <BoneBlock className="w-24 h-1" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg">Apuntes y material</h3>
            <span className="text-accent text-sm border border-accent px-3 py-1">
              Cargar apuntes
            </span>
          </div>
          {materiales === 0 ? (
            <p className="text-sm text-foreground-muted">
              No hay material subido todavía.
            </p>
          ) : (
            <div className="border border-border-subtle divide-y divide-border-subtle">
              {Array.from({ length: Math.min(materiales, 3) }, (_, i) => (
                <div key={i} className="p-3 flex items-center gap-3">
                  <span className="text-xs font-mono w-8">
                    <Bone className="w-6" />
                  </span>
                  <span className="flex-1 text-sm">
                    <Bone className={i % 2 === 0 ? "w-40" : "w-32"} />
                  </span>
                  <span className="text-xs text-accent">Ver →</span>
                </div>
              ))}
              {materiales > 3 && (
                <div className="block p-3 text-sm text-foreground-muted">Ver todos →</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResumenLoading() {
  return (
    <MateriaLayoutSkeleton>
      {({ snapshot }) => {
        const variant = snapshot.resumenVariant ?? "con_temas";
        return (
          <>
            <div
              className={`mb-8 border ${
                snapshot.hasPreparacionConfig ? "" : "border-dashed "
              }border-border-subtle p-4`}
            >
              <p className="text-sm text-foreground-muted">
                <Bone className="w-[28rem]" />
              </p>
            </div>

            {variant === "sin_examen" && <SinExamen snapshot={snapshot} />}

            {variant !== "sin_examen" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <ExamCard />
                {snapshot.hasPreparacionConfig ? (
                  <PreparacionCard />
                ) : (
                  <PlanCard variant={variant} />
                )}
                {variant === "con_temas" ? <RecomendadoCard /> : <SiguientePasoCard />}
              </div>
            )}

            {variant === "con_temas" && <ConTemas snapshot={snapshot} />}
          </>
        );
      }}
    </MateriaLayoutSkeleton>
  );
}
