"use client";

import { useMemo, useState } from "react";
import { Icon, buttonClasses } from "@/components/ui";
import { TabLink } from "@/components/workspace/TabLink";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { fechaCorta } from "@/lib/fechas";
import { rutas } from "@/lib/routes";
import type { ArtefactoTipo } from "@/lib/types";

export type PergaminoResumen = {
  id: string;
  titulo: string;
  tipo: ArtefactoTipo;
  version: number;
  updatedAt: string;
  resumen: string;
  texto: string;
};

const VISIBLES = 6;
const MAX_RESULTADOS = 12;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function PergaminosInicio({ pergaminos }: { pergaminos: PergaminoResumen[] }) {
  const { materiaId, askChat } = useWorkspace();
  const [query, setQuery] = useState("");
  const indice = useMemo(
    () => pergaminos.map((p) => ({ p, titulo: normalizar(p.titulo), texto: normalizar(p.texto) })),
    [pergaminos]
  );

  const q = normalizar(query.trim());
  const coincidencias = q
    ? indice
        .filter((item) => item.titulo.includes(q) || item.texto.includes(q))
        .sort((a, b) => Number(b.titulo.includes(q)) - Number(a.titulo.includes(q)))
        .map((item) => item.p)
    : pergaminos;
  const visibles = coincidencias.slice(0, q ? MAX_RESULTADOS : VISIBLES);
  const restantes = coincidencias.length - visibles.length;
  const verTodos = rutas.apuntes(materiaId, { tipo: "generados" });

  return (
    <section aria-labelledby="pergaminos-titulo" className="mt-10">
      <div className="mb-2 flex h-7 items-center justify-between gap-3">
        <h2 id="pergaminos-titulo" className="t-meta">
          Pergaminos{pergaminos.length > 0 && <span className="ml-1.5 text-foreground-subtle">{pergaminos.length}</span>}
        </h2>
        {pergaminos.length > 0 && (
          <TabLink href={verTodos} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Ver todos
          </TabLink>
        )}
      </div>

      {pergaminos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg px-4 py-3.5 shadow-[0_0_0_1px_var(--border-subtle)] sm:flex-row sm:items-center">
          <Icon name="generado" size={16} className="shrink-0 text-foreground-muted" />
          <p className="min-w-0 flex-1 text-sm leading-5 text-foreground-muted">
            Cuando le pidas al chat que te explique un tema, te resuma un capítulo o te arme un simulacro, el
            pergamino queda guardado acá.
          </p>
          <button
            type="button"
            onClick={() => askChat("Explicame ")}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <Icon name="sparkle" size={14} />
            Pedile uno al chat
          </button>
        </div>
      ) : (
        <>
          <label className="relative mb-2 block">
            <span className="sr-only">Buscar en tus pergaminos</span>
            <Icon
              name="search"
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
            />
            <input
              type="text"
              enterKeyHint="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuery("");
              }}
              placeholder="Buscar por título o contenido…"
              className="h-9 w-full rounded-md bg-surface pl-8 pr-3 text-sm text-foreground shadow-[0_0_0_1px_var(--border-subtle)] outline-none transition-shadow duration-(--dur-fast) ease-(--ease-out) placeholder:text-foreground-subtle hover:shadow-[0_0_0_1px_var(--border)] focus:shadow-[0_0_0_1px_var(--border-strong)]"
            />
          </label>

          {visibles.length === 0 ? (
            <p className="px-2 py-2.5 text-sm leading-6 text-foreground-muted">
              Ningún pergamino habla de «{query.trim()}».{" "}
              <button
                type="button"
                onClick={() => askChat(`Explicame ${query.trim()}`)}
                className="text-foreground underline-offset-4 hover:underline"
              >
                Pedíselo al chat →
              </button>
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 @min-[560px]:grid-cols-2 @min-[860px]:grid-cols-3">
              {visibles.map((p) => (
                <li key={p.id}>
                  <TabLink
                    href={rutas.generado(materiaId, p.id)}
                    tabTitle={p.titulo}
                    className="flex h-full min-h-[84px] flex-col gap-1 rounded-lg bg-surface px-3 py-2.5 shadow-[0_0_0_1px_var(--border-subtle)] transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-surface-elevated"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon
                        name={p.tipo === "examen" ? "examen" : "generado"}
                        size={14}
                        className="shrink-0 text-foreground-muted"
                      />
                      <span className="min-w-0 truncate text-sm font-medium leading-5 text-foreground">{p.titulo}</span>
                    </span>
                    {p.resumen && (
                      <span className="line-clamp-2 text-xs leading-[18px] text-foreground-muted">{p.resumen}</span>
                    )}
                    <span className="mt-auto font-mono text-[11px] leading-4 text-foreground-subtle">
                      {p.tipo === "examen" ? "Simulacro" : "Pergamino"} · v{p.version}
                      {fechaCorta(p.updatedAt) ? ` · ${fechaCorta(p.updatedAt)}` : ""}
                    </span>
                  </TabLink>
                </li>
              ))}
            </ul>
          )}
          {restantes > 0 && (
            <TabLink
              href={verTodos}
              className="mt-2 inline-block px-2 text-xs text-foreground-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              {q ? `y ${restantes} más` : `Ver los ${pergaminos.length} pergaminos`} →
            </TabLink>
          )}
        </>
      )}
    </section>
  );
}
