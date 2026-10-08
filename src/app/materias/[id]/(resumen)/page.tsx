import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { lineaProximo, cuandoEvento } from "@/components/home/home-format";
import { buttonClasses } from "@/components/ui/Button";
import { Icon, apunteIconName, fileIconName } from "@/components/ui/Icon";
import { TabLink } from "@/components/workspace/TabLink";
import { TabMeta } from "@/components/workspace/WorkspaceContext";
import { getExamenes, getMateria, listEventos } from "@/lib/db";
import { extractoPlano } from "@/lib/editor-markdown";
import { fechaCorta, hoyYmd, sumarDias } from "@/lib/fechas";
import { rutas } from "@/lib/routes";
import type { ApunteItem, EventoResumen, Nota } from "@/lib/types";
import { listApuntes, listNotas } from "@/lib/workspace-store";
import { AccionInline, AccionesMateria, MateriaMenu, PrimerosPasos, RefrescarAlSubir } from "./MateriaAcciones";

export const dynamic = "force-dynamic";

const MAX_FILAS = 4;

function apunteTitulo(item: ApunteItem): string {
  return item.origen === "archivo" ? item.name : item.titulo;
}

function apunteTipo(item: ApunteItem): string {
  if (item.origen === "generado") return item.tipo === "examen" ? "Examen del chat" : "Del chat";
  if (item.esExamen) return "Examen";
  const icon = fileIconName(item.type, item.name);
  if (icon === "pdf") return "PDF";
  if (icon === "imagen") return "Imagen";
  if (icon === "texto") return "Texto";
  if (icon === "video") return "Video";
  return "Archivo";
}

function apunteHref(materiaId: string, item: ApunteItem): string {
  return item.origen === "archivo" ? rutas.archivo(materiaId, item.id) : rutas.generado(materiaId, item.id);
}

export default async function MateriaInicioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hoy = hoyYmd();
  const [materia, notas, apuntes, eventos, examenes] = await Promise.all([
    getMateria(id),
    listNotas(id),
    listApuntes(id),
    listEventos({ materiaId: id, desde: hoy, hasta: sumarDias(hoy, 365) }),
    getExamenes(id),
  ]);
  if (!materia) notFound();

  const info = [materia.catedra, materia.faculty].filter(Boolean).join(" · ");
  const hayArchivos = apuntes.some((item) => item.origen === "archivo");
  const hechos = { clase: notas.length > 0, apunte: hayArchivos, fecha: examenes.length > 0 };
  const vacia = !hechos.clase && !hechos.apunte && !hechos.fecha;
  const pasosPendientes = !hechos.clase || !hechos.apunte || !hechos.fecha;

  return (
    <div className="@container mx-auto w-full max-w-[960px] px-4 pb-16 pt-6 md:px-8 md:pt-10">
      <TabMeta title={materia.name} />
      <RefrescarAlSubir />

      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="t-display break-words">{materia.name}</h1>
          {info && <p className="t-meta mt-1">{info}</p>}
          <p className="mt-2 text-[15px] leading-[22px] text-foreground-muted">{lineaProximo(eventos[0])}</p>
        </div>
        <div className="shrink-0 pt-1.5">
          <MateriaMenu materiaName={materia.name} />
        </div>
      </header>

      <AccionesMateria />

      {pasosPendientes && <PrimerosPasos hechos={hechos} />}

      {!vacia && (
        <div className="mt-10 grid grid-cols-1 gap-8 lg:@min-[720px]:grid-cols-12">
          <Seccion
            id="clases-recientes"
            titulo="Clases recientes"
            link={{ href: rutas.clases(id), label: "Ver todas" }}
            className="lg:@min-[720px]:col-span-7"
          >
            {notas.length === 0 ? (
              <Vacio>
                Todavía no tenés clases anotadas. <AccionInline accion="clase">Empezá una →</AccionInline>
              </Vacio>
            ) : (
              <ul>
                {notas.slice(0, MAX_FILAS).map((nota) => (
                  <ClaseFila key={nota.id} materiaId={id} nota={nota} />
                ))}
              </ul>
            )}
          </Seccion>

          <Seccion
            id="se-viene"
            titulo="Se viene"
            link={{ href: rutas.calendario(id), label: "Ver calendario" }}
            className="lg:@min-[720px]:col-span-5"
          >
            {eventos.length === 0 ? (
              <Vacio>
                Nada en las próximas semanas. <AccionInline accion="fecha">Cargá una fecha →</AccionInline>
              </Vacio>
            ) : (
              <ul>
                {eventos.slice(0, MAX_FILAS).map((evento) => (
                  <EventoFila key={evento.id} materiaId={id} evento={evento} />
                ))}
              </ul>
            )}
          </Seccion>

          <Seccion
            id="apuntes-recientes"
            titulo="Apuntes recientes"
            link={{ href: rutas.apuntes(id), label: "Ver todos" }}
            className="lg:@min-[720px]:col-span-12"
          >
            {apuntes.length === 0 ? (
              <Vacio>
                Todavía no subiste apuntes. <AccionInline accion="subir">Subí uno →</AccionInline>
              </Vacio>
            ) : (
              <ul className="grid grid-cols-1 gap-1 @min-[480px]:grid-cols-2 @min-[800px]:grid-cols-4">
                {apuntes.slice(0, MAX_FILAS).map((item) => (
                  <li key={`${item.origen}-${item.id}`}>
                    <TabLink
                      href={apunteHref(id, item)}
                      title={apunteTitulo(item)}
                      className="flex h-12 items-center gap-2.5 rounded-md px-2 transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover"
                    >
                      <Icon name={apunteIconName(item)} size={16} className="shrink-0 text-foreground-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm leading-5 text-foreground">{apunteTitulo(item)}</span>
                        <span className="block truncate font-mono text-[11px] leading-4 text-foreground-subtle">
                          {apunteTipo(item)}
                        </span>
                      </span>
                    </TabLink>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
        </div>
      )}
    </div>
  );
}

function Seccion({
  id,
  titulo,
  link,
  className,
  children,
}: {
  id: string;
  titulo: string;
  link: { href: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-2 flex h-7 items-center justify-between gap-3">
        <h2 id={id} className="t-meta">
          {titulo}
        </h2>
        <TabLink href={link.href} className={buttonClasses({ variant: "ghost", size: "sm" })}>
          {link.label}
        </TabLink>
      </div>
      {children}
    </section>
  );
}

function Vacio({ children }: { children: ReactNode }) {
  return <p className="px-2 py-2.5 text-sm leading-6 text-foreground-muted">{children}</p>;
}

function ClaseFila({ materiaId, nota }: { materiaId: string; nota: Nota }) {
  const resumen = extractoPlano(nota.contenido);
  return (
    <li>
      <TabLink
        href={rutas.clase(materiaId, nota.id)}
        tabTitle={nota.titulo || "Sin título"}
        className="flex h-11 items-center gap-3 rounded-md px-2 transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm leading-5 text-foreground">{nota.titulo || "Sin título"}</span>
          {resumen && <span className="block truncate text-xs leading-4 text-foreground-muted">{resumen}</span>}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-foreground-subtle">{fechaCorta(nota.updatedAt)}</span>
      </TabLink>
    </li>
  );
}

function EventoFila({ materiaId, evento }: { materiaId: string; evento: EventoResumen }) {
  const [dia, mes] = (fechaCorta(evento.date) ?? "").split(" ");
  return (
    <li>
      <TabLink
        href={rutas.evento(materiaId, evento.id)}
        tabTitle={evento.name}
        className="flex h-12 items-center gap-3 rounded-md px-2 transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md bg-hover font-mono text-[11px] leading-[13px] text-foreground-muted"
        >
          {dia && mes ? (
            <>
              <span className="text-foreground">{dia}</span>
              <span>{mes}</span>
            </>
          ) : (
            "—"
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm leading-5 text-foreground">{evento.name}</span>
          <span className="block truncate text-xs leading-4 text-foreground-muted">{cuandoEvento(evento)}</span>
        </span>
      </TabLink>
    </li>
  );
}
