"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import {
  Button,
  ConfirmDialog,
  Icon,
  IconButton,
  Menu,
  SegmentedControl,
  toast,
  type MenuItem,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { parseExamen } from "@/lib/artefactos";
import { fechaCorta } from "@/lib/fechas";
import { crearNota, descargarMarkdown } from "@/lib/notas-client";
import { rutas } from "@/lib/routes";
import { tabKey } from "@/lib/tabs";
import type { Artefacto, ArtefactoVersion } from "@/lib/types";
import { ExamenInteractivo } from "./ExamenInteractivo";
import { FocusRegister, useWorkspace } from "./WorkspaceContext";
import { useTabs } from "./tabs-store";

type Vista = "rendir" | "solucionario";

const VISTAS: { value: Vista; label: string }[] = [
  { value: "rendir", label: "Rendir" },
  { value: "solucionario", label: "Solucionario" },
];

function startsWithTitle(markdown: string): boolean {
  const first = markdown.split("\n").find((line) => line.trim()) ?? "";
  return /^#\s/.test(first.trim());
}

export function ArtefactoViewer({
  artefacto,
  versiones,
  initialVersion,
}: {
  artefacto: Artefacto;
  versiones: ArtefactoVersion[];
  initialVersion?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { materiaId, askChat, bumpRefresh } = useWorkspace();
  const { tabs, close } = useTabs();
  const [version, setVersion] = useState(initialVersion ?? artefacto.version);
  const [vista, setVista] = useState<Vista>("rendir");
  const [confirmOpen, setConfirmOpen] = useState(false);

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
  const esExamen = artefacto.tipo === "examen";
  const ordenadas = useMemo(() => [...versiones].sort((a, b) => b.version - a.version), [versiones]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(actual.contenido);
      toast({ message: "Copiado como Markdown" });
    } catch {
      toast({ message: "No se pudo copiar.", tone: "error" });
    }
  }

  async function copiarAClase() {
    try {
      const nota = await crearNota(materiaId, { titulo: actual.titulo, contenido: actual.contenido });
      bumpRefresh();
      router.push(rutas.clase(materiaId, nota.id));
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "No se pudo crear la clase.", tone: "error" });
    }
  }

  async function borrar() {
    try {
      const response = await apiFetch(`/api/artefactos/${artefacto.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo borrar.");
      setConfirmOpen(false);
      bumpRefresh();
      if (tabs.some((tab) => tabKey(tab.href) === tabKey(pathname))) close(pathname, { deleted: true });
      else router.replace(rutas.apuntes(materiaId, { tipo: "generados" }));
    } catch (error) {
      setConfirmOpen(false);
      toast({ message: error instanceof Error ? error.message : "No se pudo borrar.", tone: "error" });
    }
  }

  const menuItems: MenuItem[] = [
    { label: "Descargar .md", icon: "download", onSelect: () => descargarMarkdown(actual.titulo, actual.contenido) },
    { label: "Copiar a una clase nueva", icon: "clase", onSelect: () => void copiarAClase() },
    { separator: true },
    { label: "Borrar", icon: "trash", danger: true, onSelect: () => setConfirmOpen(true) },
  ];

  const versionItems: MenuItem[] = ordenadas.map((v) => ({
    label: `v${v.version}${fechaCorta(v.createdAt) ? ` · ${fechaCorta(v.createdAt)}` : ""}`,
    icon: v.version === version ? "check" : undefined,
    onSelect: () => elegirVersion(v.version),
  }));

  function elegirVersion(next: number) {
    setVersion(next);
    const url = next === artefacto.version ? pathname : `${pathname}?v=${next}`;
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-6 md:px-8 md:pt-10">
      <FocusRegister
        kind="artefacto"
        id={artefacto.id}
        titulo={artefacto.titulo}
        icon={esExamen ? "examen" : "generado"}
      />

      <header className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <p className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] leading-4 text-foreground-subtle">
          <Icon name={esExamen ? "examen" : "generado"} size={12} />
          <span>{esExamen ? "Examen del chat" : "Documento del chat"}</span>
          <span aria-hidden="true">·</span>
          {versiones.length > 1 ? (
            <Menu
              label="Versiones"
              placement="bottom-start"
              width={200}
              items={versionItems}
              trigger={(props) => (
                <button
                  {...props}
                  type="button"
                  aria-label={`Versión ${version}. Cambiar versión`}
                  className="inline-flex h-6 items-center gap-0.5 rounded-sm px-1 font-mono text-[11px] text-foreground-muted transition-colors hover:bg-hover hover:text-foreground pointer-coarse:h-10"
                >
                  v{version}
                  <Icon name="chevron-down" size={12} />
                </button>
              )}
            />
          ) : (
            <span>v{version}</span>
          )}
          {fechaCorta(actual.createdAt) && (
            <>
              <span aria-hidden="true">·</span>
              <span>{fechaCorta(actual.createdAt)}</span>
            </>
          )}
        </p>
        <div className="ml-auto flex items-center gap-1">
          {interactivo && (
            <SegmentedControl size="sm" value={vista} options={VISTAS} onChange={setVista} ariaLabel="Vista del examen" />
          )}
          <Button variant="ghost" size="sm" icon="sparkle" onClick={() => askChat("Cambiá este documento: ")}>
            Pedir cambios
          </Button>
          <IconButton icon="copy" label="Copiar como Markdown" size={28} onClick={() => void copiar()} />
          <Menu
            label="Acciones del documento"
            items={menuItems}
            trigger={(props) => <IconButton {...props} icon="more" label="Más acciones" size={28} />}
          />
        </div>
      </header>

      {!startsWithTitle(actual.contenido) && (
        <h1 className="t-doc-title mt-4 text-foreground [overflow-wrap:anywhere]">{actual.titulo}</h1>
      )}

      <div className="mt-6">
        {interactivo && vista === "rendir" && examen ? (
          <ExamenInteractivo key={`${artefacto.id}-${version}`} examen={examen} />
        ) : (
          <ChatMarkdown className="doc-markdown">{actual.contenido}</ChatMarkdown>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`¿Borrar «${artefacto.titulo}»?`}
        body="No se puede deshacer."
        onConfirm={borrar}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
