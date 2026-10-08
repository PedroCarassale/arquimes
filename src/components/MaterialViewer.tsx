"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { enLectura, lecturaEstado, metaArchivo } from "@/app/materias/[id]/apuntes/apunte-format";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  IconButton,
  Menu,
  buttonClasses,
  fileIconName,
  toast,
  type MenuItem,
} from "@/components/ui";
import { TabLink } from "@/components/workspace/TabLink";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { useTabs } from "@/components/workspace/tabs-store";
import { apiFetch } from "@/lib/api";
import { inferMaterialViewerKind, materialFileUrl } from "@/lib/material-viewer";
import { rutas } from "@/lib/routes";
import { tabKey } from "@/lib/tabs";
import type { LecturaArchivo } from "@/lib/types";

type MaterialViewerProps = {
  materiaId: string;
  materialId: string;
  name: string;
  type: string;
  size: number;
  addedAt?: string;
  esExamen?: boolean;
  examenId?: string;
  lectura?: LecturaArchivo;
};

type Preview = "pdf" | "image" | "text" | "video" | "none";

const MAX_TEXT_CHARS = 300_000;
const MARKDOWN_EXTENSIONS = /\.(md|markdown)$/i;

function previewKind(type: string, name: string): Preview {
  if (fileIconName(type, name) === "video") return "video";
  const kind = inferMaterialViewerKind(type, name);
  return kind === "unsupported" ? "none" : kind;
}

export function MaterialViewer({
  materiaId,
  materialId,
  name,
  type,
  size,
  addedAt,
  esExamen = false,
  examenId,
  lectura,
}: MaterialViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { openChat, bumpRefresh } = useWorkspace();
  const { tabs, close } = useTabs();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const preview = previewKind(type, name);
  const inlineUrl = materialFileUrl(materiaId, materialId);
  const downloadUrl = materialFileUrl(materiaId, materialId, { download: true });
  const estado = lecturaEstado(lectura);

  async function borrar() {
    try {
      const response = await apiFetch(`/api/materiales/${materialId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo borrar el archivo.");
      }
      setConfirmOpen(false);
      bumpRefresh();
      if (tabs.some((tab) => tabKey(tab.href) === tabKey(pathname))) close(pathname, { deleted: true });
      else router.replace(rutas.apuntes(materiaId));
    } catch (error) {
      setConfirmOpen(false);
      toast({ message: error instanceof Error ? error.message : "No se pudo borrar el archivo.", tone: "error" });
    }
  }

  const menuItems: MenuItem[] = [
    ...(preview !== "none"
      ? [{ label: "Abrir en el navegador", icon: "link" as const, onSelect: () => window.open(inlineUrl, "_blank", "noopener") }]
      : []),
    { label: "Descargar", icon: "download", onSelect: () => window.location.assign(downloadUrl) },
    { separator: true },
    { label: "Borrar", icon: "trash", danger: true, onSelect: () => setConfirmOpen(true) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-10 pt-6 md:px-8 md:pt-8">
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-mono text-[11px] leading-4 text-foreground-subtle">
            <Icon name={esExamen ? "examen" : fileIconName(type, name)} size={12} />
            <span className="truncate">
              {metaArchivo({ type, name, size, addedAt, esExamen })}
              {estado && <span className={enLectura(lectura) ? "text-foreground-muted" : undefined}> · {estado}</span>}
            </span>
          </p>
          <h1 className="t-doc-title mt-1 text-foreground [overflow-wrap:anywhere]">{name}</h1>
          {esExamen && examenId && (
            <TabLink
              href={rutas.evento(materiaId, examenId)}
              className="mt-2 inline-flex items-center gap-1 rounded-sm text-sm text-foreground-muted transition-colors hover:text-foreground"
            >
              <Icon name="calendario" size={14} />
              Ver el evento de este examen
            </TabLink>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 pt-1">
          <Button
            variant="secondary"
            size="sm"
            icon="chat"
            onClick={() => openChat({ focusComposer: true })}
            className="max-sm:hidden"
          >
            Preguntarle al chat
          </Button>
          <IconButton
            icon="chat"
            label="Preguntarle al chat"
            size={32}
            onClick={() => openChat({ focusComposer: true })}
            className="sm:hidden"
          />
          <Menu
            label="Acciones del archivo"
            trigger={(props) => <IconButton {...props} icon="more" label="Más acciones" size={32} />}
            items={menuItems}
          />
        </div>
      </header>

      <div className="mt-6">
        <ViewerContent preview={preview} inlineUrl={inlineUrl} downloadUrl={downloadUrl} name={name} type={type} />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`¿Borrar «${name}»?`}
        body="No se puede deshacer."
        onConfirm={borrar}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function ViewerContent({
  preview,
  inlineUrl,
  downloadUrl,
  name,
  type,
}: {
  preview: Preview;
  inlineUrl: string;
  downloadUrl: string;
  name: string;
  type: string;
}) {
  if (preview === "pdf") {
    return (
      <iframe
        src={inlineUrl}
        title={`Vista previa de ${name}`}
        className="h-[calc(100dvh-240px)] min-h-[420px] w-full rounded-lg border border-border-subtle bg-surface"
      />
    );
  }

  if (preview === "image") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-lg bg-surface p-2">
        <Image
          src={inlineUrl}
          alt={name}
          width={1600}
          height={1200}
          unoptimized
          className="h-auto max-h-[75vh] w-auto max-w-full rounded-md object-contain"
        />
      </div>
    );
  }

  if (preview === "video") {
    return (
      <video
        src={inlineUrl}
        controls
        preload="metadata"
        className="max-h-[75vh] w-full rounded-lg bg-black"
      />
    );
  }

  if (preview === "text") {
    return <TextPreview url={inlineUrl} markdown={MARKDOWN_EXTENSIONS.test(name) || type.includes("markdown")} />;
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-surface">
      <EmptyState
        size="sm"
        icon="apunte"
        title="Este archivo no tiene vista previa."
        description="Descargalo para abrirlo en tu compu. El chat igual puede leerlo si tiene texto."
        action={
          <a href={downloadUrl} className={buttonClasses({ variant: "secondary", size: "md" })}>
            <Icon name="download" size={16} />
            Descargar
          </a>
        }
      />
    </div>
  );
}

type TextState = { status: "loading" } | { status: "ok"; text: string; truncated: boolean } | { status: "error" };

function TextPreview({ url, markdown }: { url: string; markdown: boolean }) {
  const [state, setState] = useState<TextState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    apiFetch(url)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
      .then((text) => {
        if (!alive) return;
        setState({ status: "ok", text: text.slice(0, MAX_TEXT_CHARS), truncated: text.length > MAX_TEXT_CHARS });
      })
      .catch(() => {
        if (alive) setState({ status: "error" });
      });
    return () => {
      alive = false;
    };
  }, [url]);

  if (state.status === "loading") {
    return <div aria-busy="true" className="t-skeleton-line h-64 w-full rounded-lg" />;
  }
  if (state.status === "error") {
    return <p className="rounded-lg bg-surface px-4 py-3 text-sm text-foreground-muted">No se pudo mostrar el texto. Probá descargarlo.</p>;
  }
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-5 py-4">
      {markdown ? (
        <ChatMarkdown className="doc-markdown">{state.text}</ChatMarkdown>
      ) : (
        <pre className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere]">
          {state.text}
        </pre>
      )}
      {state.truncated && (
        <p className="mt-4 font-mono text-[11px] text-foreground-subtle">Se muestra solo el principio. Descargalo para verlo completo.</p>
      )}
    </div>
  );
}
