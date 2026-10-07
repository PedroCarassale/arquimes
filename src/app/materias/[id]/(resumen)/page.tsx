import Link from "next/link";
import { getExamenes, getMateriales, getTemasForMateria } from "@/lib/db";
import { listArtefactos, listNotas } from "@/lib/workspace-store";
import { calculatePreparation } from "@/lib/mastery";
import {
  cuentaRegresiva,
  diasHasta,
  evaluacionNombre,
  evaluacionTipoLabel,
  fechaLarga,
  ordenarEvaluaciones,
  proximaEvaluacion,
} from "@/lib/evaluaciones";
import { MASTERY_LABELS, MASTERY_ORDER, type MasteryState, type Tema } from "@/lib/types";
import { NuevaNotaButtons } from "@/components/workspace/NuevaNotaButtons";
import { PedirAlChat } from "@/components/workspace/PedirAlChat";

export const dynamic = "force-dynamic";

const MASTERY_BAR: Record<MasteryState, string> = {
  no_estudiado: "bg-surface-elevated",
  empezado: "bg-foreground-subtle",
  estudiado: "bg-foreground-muted",
  necesita_practica: "bg-red-300/70",
  dominado: "bg-accent",
};

export default async function MateriaInicioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [examenes, temas, notas, artefactos, materiales] = await Promise.all([
    getExamenes(id),
    getTemasForMateria(id),
    listNotas(id),
    listArtefactos(id),
    getMateriales(id),
  ]);

  const proxima = proximaEvaluacion(examenes);
  const proximas = ordenarEvaluaciones(examenes).filter((e) => {
    const dias = diasHasta(e.date);
    return dias === null || dias >= 0;
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <Preparacion
        materiaId={id}
        proxima={proxima}
        temas={proxima ? temas.filter((t) => t.examenId === proxima.id) : []}
        hayEvaluaciones={examenes.length > 0}
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-3">
        <Bloque titulo="Próximos" href={`/materias/${id}/examenes`} accion="Ver todos">
          {proximas.length === 0 ? (
            <Vacio>
              Nada cargado.{" "}
              <Link href={`/materias/${id}/examenes/nuevo`} className="text-accent underline">
                Cargar examen o entrega
              </Link>
            </Vacio>
          ) : (
            proximas.slice(0, 4).map((e) => (
              <Fila key={e.id} href={`/materias/${id}/examenes/${e.id}`} meta={evaluacionTipoLabel(e)}>
                <span className="block truncate">{evaluacionNombre(e)}</span>
                <span className="block text-xs text-foreground-muted">{cuentaRegresiva(e.date) ?? "Sin fecha"}</span>
              </Fila>
            ))
          )}
        </Bloque>

        <Bloque titulo="Notas" href={`/materias/${id}/notas`} accion="Ver todas">
          {notas.length === 0 ? (
            <div className="space-y-3">
              <Vacio>Todavía no escribiste notas de clase.</Vacio>
              <NuevaNotaButtons materiaId={id} />
            </div>
          ) : (
            notas.slice(0, 4).map((n) => (
              <Fila
                key={n.id}
                href={`/materias/${id}/notas/${n.id}`}
                meta={new Date(n.updatedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
              >
                <span className="block truncate">{n.titulo}</span>
              </Fila>
            ))
          )}
        </Bloque>

        <Bloque titulo="Generados" href={`/materias/${id}/generados`} accion="Ver todos">
          {artefactos.length === 0 ? (
            <div className="space-y-2">
              <Vacio>Pedile al chat un examen de práctica y aparece acá.</Vacio>
              <PedirAlChat texto="Armame un examen de práctica corto con lo que tengo cargado." label="Pedir un examen de práctica" />
            </div>
          ) : (
            artefactos.slice(0, 4).map((a) => (
              <Fila key={a.id} href={`/materias/${id}/generados/${a.id}`} meta={a.tipo === "examen" ? "Examen" : "Doc"}>
                <span className="block truncate">{a.titulo}</span>
              </Fila>
            ))
          )}
        </Bloque>
      </div>

      <p className="mt-12 border-t border-border-subtle pt-4 text-sm text-foreground-muted">
        {materiales.length === 0 ? (
          <>
            No subiste material.{" "}
            <Link href={`/materias/${id}/apuntes`} className="text-accent underline">
              Subí PDFs, fotos o apuntes
            </Link>{" "}
            para que el chat pueda enseñarte desde ahí.
          </>
        ) : (
          <>
            <Link href={`/materias/${id}/apuntes`} className="text-foreground hover:text-accent">
              {materiales.length} {materiales.length === 1 ? "archivo" : "archivos"} en Material
            </Link>
            {" · "}el chat los usa como fuente.
          </>
        )}
      </p>
    </div>
  );
}

function Preparacion({
  materiaId,
  proxima,
  temas,
  hayEvaluaciones,
}: {
  materiaId: string;
  proxima?: Awaited<ReturnType<typeof getExamenes>>[number];
  temas: Tema[];
  hayEvaluaciones: boolean;
}) {
  const pregunta = (
    <div className="mb-3 font-mono text-xs uppercase tracking-wider text-foreground-muted">
      ¿Qué tan preparado estoy?
    </div>
  );

  if (!proxima) {
    return (
      <section>
        {pregunta}
        <p className="max-w-2xl font-serif text-3xl leading-snug sm:text-4xl">
          {hayEvaluaciones
            ? "No tenés ningún examen ni entrega con fecha por delante."
            : "Todavía no sé para qué te estás preparando."}
        </p>
        <p className="mt-3 max-w-xl text-sm text-foreground-muted">
          Cargá el próximo parcial o la próxima entrega, con su fecha y sus temas. Con eso te digo honestamente
          cómo venís.
        </p>
        <Link
          href={`/materias/${materiaId}/examenes/nuevo`}
          className="mt-5 inline-flex bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90"
        >
          Cargar examen o entrega
        </Link>
      </section>
    );
  }

  const nombre = evaluacionNombre(proxima);
  const cuenta = cuentaRegresiva(proxima.date);

  if (temas.length === 0) {
    return (
      <section>
        {pregunta}
        <p className="max-w-2xl font-serif text-3xl leading-snug sm:text-4xl">
          {nombre} {cuenta}, pero no cargaste sus temas.
        </p>
        <p className="mt-3 max-w-xl text-sm text-foreground-muted">
          Sin temas no puedo estimar tu preparación. Agregalos y cada examen de práctica los va moviendo.
        </p>
        <Link
          href={`/materias/${materiaId}/examenes/${proxima.id}`}
          className="mt-5 inline-flex bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90"
        >
          Agregar temas
        </Link>
      </section>
    );
  }

  const preparacion = calculatePreparation(temas);
  const sinEstudiar = temas.filter((t) => t.masteryState === "no_estudiado").length;
  const conteo = MASTERY_ORDER.map((state) => ({
    state,
    count: temas.filter((t) => t.masteryState === state).length,
  })).filter((c) => c.count > 0);

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        {pregunta}
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-6xl text-accent sm:text-7xl">{preparacion}%</span>
          <span className="text-sm text-foreground-muted">preparación estimada</span>
        </div>
        <p className="mt-3 max-w-xl font-serif text-2xl leading-snug">
          <Link href={`/materias/${materiaId}/examenes/${proxima.id}`} className="hover:text-accent">
            {nombre}
          </Link>{" "}
          {cuenta}
          {fechaLarga(proxima.date) && (
            <span className="text-foreground-muted"> · {fechaLarga(proxima.date)?.toLowerCase()}</span>
          )}
        </p>
        <p className="mt-2 max-w-xl text-sm text-foreground-muted">
          {sinEstudiar === temas.length
            ? "Ningún tema practicado todavía: este número sube cuando rendís exámenes de práctica."
            : sinEstudiar > 0
              ? `${sinEstudiar} de ${temas.length} temas sin estudiar.`
              : "Ya practicaste todos los temas. Seguí rindiendo simulacros para consolidar."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <PedirAlChat
            texto={`Armame un simulacro de «${nombre}» priorizando los temas que tengo más flojos.`}
            label="Rendir un simulacro"
            className="bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90"
          />
          <PedirAlChat
            texto={`¿Qué me falta para estar preparado para «${nombre}»? Armame un plan hasta la fecha.`}
            label="¿Qué me falta?"
            className="border border-border px-4 py-2 text-sm hover:border-accent"
          />
        </div>
      </div>
      <div>
        <div className="mb-3 flex h-1.5 w-full overflow-hidden">
          {temas.map((t) => (
            <span key={t.id} className={`h-full flex-1 border-r border-background ${MASTERY_BAR[t.masteryState]}`} />
          ))}
        </div>
        <ul className="space-y-1.5 text-sm">
          {conteo.map((c) => (
            <li key={c.state} className="flex items-center gap-2">
              <span className={`h-2 w-2 ${MASTERY_BAR[c.state]}`} />
              <span className="flex-1 text-foreground-muted">{MASTERY_LABELS[c.state]}</span>
              <span className="font-mono text-xs">{c.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Bloque({
  titulo,
  href,
  accion,
  children,
}: {
  titulo: string;
  href: string;
  accion: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between border-b border-border-subtle pb-2">
        <h3 className="font-mono text-xs uppercase tracking-wider text-foreground-muted">{titulo}</h3>
        <Link href={href} className="text-xs text-foreground-muted hover:text-accent">
          {accion}
        </Link>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Fila({ href, meta, children }: { href: string; meta: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group flex items-start gap-3 px-1 py-2 text-sm transition-colors hover:bg-surface">
      <span className="w-14 shrink-0 pt-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground-muted">{meta}</span>
      <span className="min-w-0 flex-1 group-hover:text-accent">{children}</span>
    </Link>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-2 text-sm text-foreground-muted">{children}</p>;
}
