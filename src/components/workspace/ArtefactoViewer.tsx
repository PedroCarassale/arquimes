"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { parseExamen } from "@/lib/artefactos";
import { crearNota, descargarMarkdown } from "@/lib/notas-client";
import type { Artefacto, ArtefactoVersion } from "@/lib/types";
import { ExamenInteractivo } from "./ExamenInteractivo";
import { FocusRegister, useWorkspace } from "./WorkspaceContext";

export function ArtefactoViewer({
  artefacto,
  versiones,
}: {
  artefacto: Artefacto;
  versiones: ArtefactoVersion[];
}) {
  const router = useRouter();
  const { materiaId, askChat, bumpRefresh } = useWorkspace();
  const [version, setVersion] = useState(artefacto.version);
  const [vista, setVista] = useState<"interactivo" | "documento">("interactivo");
  const [aviso, setAviso] = useState<string | null>(null);

  const actual = versiones.find((v) => v.version === version) ?? {
    version: artefacto.version,
    titulo: artefacto.titulo,
    contenido: artefacto.contenido,
    createdAt: artefacto.updatedAt,
  };
  const examen = useMemo(
    () => (artefacto.tipo === "examen" ? parseExamen(actual.contenido) : null),
    [artefacto.tipo, actual.contenido]
  );
  const interactivo = Boolean(examen && examen.preguntas.length > 0);

  async function guardarComoNota() {
    try {
      const nota = await crearNota(materiaId, { titulo: actual.titulo, contenido: actual.contenido });
      setAviso("Guardado en Notas.");
      router.push(`/materias/${materiaId}/notas/${nota.id}`);
      router.refresh();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No pude guardarlo como nota.");
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(actual.contenido);
      setAviso("Copiado al portapapeles.");
    } catch {
      setAviso("No pude copiar.");
    }
  }

  async function borrar() {
    if (!window.confirm(`¿Borrar «${artefacto.titulo}» y todas sus versiones?`)) return;
    await apiFetch(`/api/artefactos/${artefacto.id}`, { method: "DELETE" });
    bumpRefresh();
    router.push(`/materias/${materiaId}/generados`);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-8">
      <FocusRegister kind="artefacto" id={artefacto.id} titulo={artefacto.titulo} />
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono uppercase tracking-wider text-accent">
          {artefacto.tipo === "examen" ? "Examen" : "Documento"}
        </span>
        {versiones.length > 1 && (
          <select
            value={version}
            onChange={(e) => setVersion(Number(e.target.value))}
            aria-label="Versión"
            className="border border-border bg-background py-1 pl-2 font-mono text-xs"
          >
            {versiones.map((v) => (
              <option key={v.version} value={v.version}>
                v{v.version} · {new Date(v.createdAt).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </option>
            ))}
          </select>
        )}
        {interactivo && (
          <div className="flex border border-border-subtle">
            {(["interactivo", "documento"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={vista === v}
                onClick={() => setVista(v)}
                className={`px-2.5 py-1 font-mono uppercase tracking-wider ${
                  vista === v ? "bg-surface-elevated text-foreground" : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {v === "interactivo" ? "Rendir" : "Solucionario"}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex flex-wrap gap-1">
          <ToolbarButton onClick={() => askChat("Cambiá este documento: ")}>Pedir cambios</ToolbarButton>
          <ToolbarButton onClick={() => void copiar()}>Copiar</ToolbarButton>
          <ToolbarButton onClick={() => descargarMarkdown(actual.titulo, actual.contenido)}>.md</ToolbarButton>
          <ToolbarButton onClick={() => void guardarComoNota()}>A notas</ToolbarButton>
          <ToolbarButton onClick={() => void borrar()} danger>
            Borrar
          </ToolbarButton>
        </div>
      </div>
      {aviso && (
        <p role="status" className="mb-4 text-sm text-foreground-muted">
          {aviso}
        </p>
      )}

      {!/^#\s/m.test(actual.contenido.split("\n").find((l) => l.trim()) || "") && (
        <h2 className="mb-4 font-serif text-4xl leading-tight">{actual.titulo}</h2>
      )}

      {interactivo && vista === "interactivo" && examen ? (
        <ExamenInteractivo
          key={`${artefacto.id}-${version}`}
          artefactoId={artefacto.id}
          materiaId={materiaId}
          examen={examen}
        />
      ) : (
        <ChatMarkdown className="doc-markdown">{actual.contenido}</ChatMarkdown>
      )}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border border-border-subtle px-2.5 py-1 text-foreground-muted transition-colors ${
        danger ? "hover:border-red-400/60 hover:text-red-300" : "hover:border-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
