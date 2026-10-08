import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SeguirDondeDejaste } from "@/components/home/SeguirDondeDejaste";
import { cantidad, cuandoEvento, grupoSeVieneGlobal, saludo, type GrupoSeVieneGlobal } from "@/components/home/home-format";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { getServerSession } from "@/lib/auth-session";
import { listEventos } from "@/lib/db";
import { fechaLarga, hoyYmd, sumarDias } from "@/lib/fechas";
import { RememberMaterias } from "@/lib/materia-snapshot";
import { materiaTone } from "@/lib/materia-tone";
import { rutas } from "@/lib/routes";
import type { EventoResumen, MateriaResumen } from "@/lib/types";
import { getMateriasResumen } from "@/lib/workspace-store";

const GRUPOS: GrupoSeVieneGlobal[] = ["Esta semana", "La que viene", "Más adelante"];

function materiaInfo(materia: MateriaResumen["materia"]): string {
  return [materia.catedra, materia.faculty].filter(Boolean).join(" · ");
}

export async function MateriasHubPage() {
  const hoy = hoyYmd();
  const [session, resumenes, eventos] = await Promise.all([
    getServerSession(),
    getMateriasResumen(),
    listEventos({ desde: hoy, hasta: sumarDias(hoy, 13) }),
  ]);

  const remember = (
    <RememberMaterias
      items={resumenes.map(({ materia }) => ({
        id: materia.id,
        snapshot: { name: materia.name, info: materiaInfo(materia) },
      }))}
    />
  );

  if (resumenes.length === 0) {
    return (
      <AppShell>
        {remember}
        <div className="px-4 pb-16 pt-[20vh]">
          <section className="t-reveal-in mx-auto flex max-w-[440px] flex-col items-center text-center">
            <Image
              src="/brand/arquimedes-mark.png"
              alt=""
              width={77}
              height={96}
              unoptimized
              preload
              className="h-24 w-auto opacity-50"
            />
            <h1 className="mt-8 font-serif text-[28px] leading-[34px]">Empezá por tu primera materia</h1>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              Cada materia guarda tus clases, apuntes y fechas.
            </p>
            <ButtonLink href={rutas.nuevaMateria} variant="primary" size="lg" className="mt-8">
              Crear materia
            </ButtonLink>
          </section>
        </div>
      </AppShell>
    );
  }

  const grupos = GRUPOS.map((grupo) => ({
    grupo,
    eventos: eventos.filter((evento) => grupoSeVieneGlobal(evento.date) === grupo),
  })).filter((item) => item.eventos.length > 0);

  return (
    <AppShell>
      {remember}
      <div className="mx-auto w-full max-w-[960px] px-4 pb-16 pt-6 md:px-8 md:pt-10">
        <header>
          <h1 className="t-greeting">{saludo(session?.user?.name)}</h1>
          <p className="mt-2 font-mono text-[11px] leading-4 tracking-[0.06em] text-foreground-subtle">
            {fechaLarga(hoy)}
          </p>
        </header>

        <SeguirDondeDejaste materias={resumenes.map(({ materia }) => ({ id: materia.id, name: materia.name }))} />

        <section aria-labelledby="se-viene-titulo" className="mt-10">
          <div className="mb-3 flex h-7 items-center justify-between gap-3">
            <h2 id="se-viene-titulo" className="t-meta">
              Se viene
            </h2>
            <Link href={rutas.calendarioGlobal} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              Ver calendario
            </Link>
          </div>
          {grupos.length === 0 ? (
            <p className="py-2 text-sm text-foreground-muted">
              Nada en los próximos 14 días.{" "}
              <Link href={rutas.calendarioGlobal} className="text-foreground underline-offset-4 hover:underline">
                Cargar una fecha
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {grupos.map(({ grupo, eventos: lista }) => (
                <div key={grupo}>
                  <h3 className="px-2 pb-1 text-xs leading-4 text-foreground-subtle">{grupo}</h3>
                  <ul>
                    {lista.map((evento) => (
                      <EventoFila key={evento.id} evento={evento} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="materias-titulo" className="mt-10">
          <h2 id="materias-titulo" className="t-meta mb-3">
            Materias
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {resumenes.map((resumen) => (
              <li key={resumen.materia.id}>
                <MateriaCard resumen={resumen} />
              </li>
            ))}
            <li>
              <Link
                href={rutas.nuevaMateria}
                className="flex h-[120px] items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle text-sm text-foreground-muted transition-colors duration-(--dur-fast) ease-(--ease-out) hover:border-border hover:bg-hover hover:text-foreground"
              >
                <Icon name="plus" size={16} />
                Nueva materia
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

function EventoFila({ evento }: { evento: EventoResumen }) {
  return (
    <li>
      <Link
        href={rutas.evento(evento.materiaId, evento.id)}
        className="flex h-11 items-center gap-3 rounded-md px-2 transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover"
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: materiaTone(evento.materiaId).color }}
        />
        <span className="min-w-0 flex-1 truncate text-sm">
          <span className="text-foreground">{evento.name}</span>
          <span className="text-foreground-muted"> · {evento.materiaName}</span>
        </span>
        <span className="shrink-0 font-mono text-[11px] text-foreground-muted">{cuandoEvento(evento)}</span>
      </Link>
    </li>
  );
}

function MateriaCard({ resumen }: { resumen: MateriaResumen }) {
  const { materia, proximoEvento, clasesCount } = resumen;
  const info = materiaInfo(materia);
  const clases = cantidad(clasesCount, "clase", "clases");
  return (
    <Card href={rutas.materia(materia.id)} className="h-[120px] px-4 py-3.5">
      <span className="flex h-full flex-col justify-between">
        <span className="min-w-0">
          <span className="block truncate font-serif text-[22px] leading-7">{materia.name}</span>
          {info && <span className="t-meta mt-0.5 block truncate">{info}</span>}
        </span>
        <span className="block truncate text-[13px] leading-[18px] text-foreground-muted">
          {proximoEvento ? `Próximo: ${proximoEvento.name}` : "Sin fechas"} · {clases}
        </span>
      </span>
    </Card>
  );
}
