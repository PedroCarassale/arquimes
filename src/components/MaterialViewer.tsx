"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatFileSize } from "@/lib/format";
import {
  inferMaterialViewerKind,
  materialFileUrl,
  type MaterialViewerKind,
} from "@/lib/material-viewer";

type MaterialViewerProps = {
  materiaId: string;
  materialId: string;
  name: string;
  type: string;
  size: number;
  backHref: string;
  backLabel?: string;
};

export function MaterialViewer({
  materiaId,
  materialId,
  name,
  type,
  size,
  backHref,
  backLabel = "Volver",
}: MaterialViewerProps) {
  const kind = inferMaterialViewerKind(type, name);
  const inlineUrl = materialFileUrl(materiaId, materialId);
  const downloadUrl = materialFileUrl(materiaId, materialId, { download: true });

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 border border-border-subtle bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 text-xs font-mono uppercase tracking-wider text-foreground-muted">
            Visor de material
          </div>
          <h2 className="truncate font-serif text-2xl">{name}</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {humanType(kind)} · {formatFileSize(size)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={backHref}
            className="border border-border px-3 py-2 hover:border-accent"
          >
            {backLabel}
          </Link>
          <a
            href={downloadUrl}
            className="bg-accent px-3 py-2 text-background hover:bg-accent/90"
          >
            Descargar
          </a>
        </div>
      </header>

      <div className="border border-border-subtle bg-background p-3 sm:p-4">
        <ViewerContent kind={kind} inlineUrl={inlineUrl} />
      </div>
    </div>
  );
}

function ViewerContent({
  kind,
  inlineUrl,
}: {
  kind: MaterialViewerKind;
  inlineUrl: string;
}) {
  const [text, setText] = useState<string>("");
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== "text") return;
    let cancelled = false;

    setLoadingText(true);
    setTextError(null);

    fetch(inlineUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No pude cargar el texto de este archivo.");
        }
        const content = await response.text();
        if (!cancelled) setText(content);
      })
      .catch((error) => {
        if (!cancelled) {
          setTextError(error instanceof Error ? error.message : "No pude abrir este texto.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingText(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inlineUrl, kind]);

  const textBody = useMemo(() => {
    if (!text) return "";
    return text.replace(/^\uFEFF/, "");
  }, [text]);

  if (kind === "pdf") {
    return (
      <iframe
        src={inlineUrl}
        title="Visor de PDF"
        className="h-[70vh] w-full border border-border-subtle bg-white"
      />
    );
  }

  if (kind === "image") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-surface p-2">
        <img
          src={inlineUrl}
          alt="Vista previa del material"
          className="max-h-[70vh] max-w-full object-contain"
        />
      </div>
    );
  }

  if (kind === "text") {
    if (loadingText) {
      return (
        <p className="py-8 text-center text-sm text-foreground-muted">
          Cargando texto…
        </p>
      );
    }
    if (textError) {
      return (
        <p role="alert" className="py-8 text-center text-sm text-red-400">
          {textError}
        </p>
      );
    }
    return (
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words bg-surface p-4 text-sm leading-6 text-foreground">
        {textBody || "Este archivo no tiene texto visible."}
      </pre>
    );
  }

  return (
    <div className="space-y-3 p-4 text-sm text-foreground-muted">
      <p>
        Este tipo de archivo todavía no tiene vista previa en línea.
      </p>
      <p>
        Podés descargarlo con el botón <strong>Descargar</strong>.
      </p>
    </div>
  );
}

function humanType(kind: MaterialViewerKind): string {
  if (kind === "pdf") return "PDF";
  if (kind === "image") return "Imagen";
  if (kind === "text") return "Texto";
  return "Archivo";
}
