"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { formatFileSize } from "@/lib/format";
import { expandStudyFiles, validateStudyFile } from "@/lib/study-upload";
import { enqueueUploads } from "@/lib/upload-queue";
import type { Materia } from "@/lib/types";

export function CargarClient({ materia }: { materia: Materia }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError("Seleccioná al menos un archivo.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const expanded = await expandStudyFiles(files);
      const invalid = expanded.map(validateStudyFile).find(Boolean);
      if (invalid) throw new Error(invalid);
      enqueueUploads(materia.id, expanded, { kind: "apuntes" });
      router.push(`/materias/${materia.id}/apuntes`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pude subir el archivo"
      );
      setUploading(false);
    }
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
  }

  return (
    <AppShell>
      <div className="px-4 py-6 sm:p-6 lg:p-8">
        <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
          Carga de material
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl mb-2">Seleccionar archivos</h1>
        <p className="text-sm text-foreground-muted mb-8">
          Paso 1 de 3 para cargar info del examen: subí apuntes o guías a{" "}
          {materia.name}. Después cargás el archivo del examen y definís temas.
        </p>

        <div className="mb-8">
          <h2 className="font-serif text-xl sm:text-2xl text-foreground-muted mb-2">
            Sumá material a la materia
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm text-foreground-muted">
              Podés cargar apuntes, guías, bibliografía, imágenes o documentos de clase.
            </p>
            <span className="text-xs font-mono text-foreground-muted">
              PDF · DOCX · PPTX · JPG · PNG · TXT · ZIP · hasta 100 MB
            </span>
          </div>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed p-6 sm:p-10 lg:p-16 mb-8 text-center transition-colors ${
            isDragging
              ? "border-accent bg-accent-muted/10"
              : files.length > 0
              ? "border-accent/50"
              : "border-border hover:border-foreground-muted"
          }`}
        >
          {files.length === 0 ? (
            <>
              <div className="w-12 h-12 mx-auto mb-4 border border-accent flex items-center justify-center">
                <span className="text-accent text-2xl">↑</span>
              </div>
              <h3 className="font-serif text-xl mb-2">
                <span className="sm:hidden">Elegí tus archivos</span>
                <span className="hidden sm:inline">Arrastrá los archivos acá</span>
              </h3>
              <p className="text-sm text-foreground-muted mb-6">
                <span className="sm:hidden">Desde tu celular: fotos, PDFs o documentos.</span>
                <span className="hidden sm:inline">También podés seleccionar archivos desde tu computadora.</span>
              </p>
              <div className="flex items-center justify-center gap-4">
                <label className="text-sm bg-accent text-background px-6 py-2 cursor-pointer hover:bg-accent/90 transition-colors uppercase tracking-wider">
                  Explorar archivos
                  <input
                    type="file"
                    multiple
                    aria-label="Explorar archivos"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.zip"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            </>
          ) : (
            <div className="text-left">
              <h3 className="font-serif text-xl mb-4">
                {files.length} archivo{files.length > 1 ? "s" : ""} seleccionado
                {files.length > 1 ? "s" : ""}
              </h3>
              <div className="space-y-2 mb-6">
                {files.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-3 py-2 border-b border-border-subtle sm:gap-4"
                  >
                    <span className="shrink-0 text-xs font-mono text-foreground-muted w-8">
                      {file.type.includes("pdf")
                        ? "PDF"
                        : file.type.includes("image")
                        ? "IMG"
                        : file.name.toLowerCase().endsWith(".zip")
                        ? "ZIP"
                        : "DOC"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                    <span className="shrink-0 text-xs text-foreground-muted">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      onClick={() => removeFile(i)}
                      className="-my-2 shrink-0 px-2 py-2 text-base text-foreground-muted hover:text-red-500"
                      aria-label={`Quitar ${file.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <label className="text-accent text-sm cursor-pointer hover:underline">
                + Agregar más archivos
                <input
                  type="file"
                  multiple
                  aria-label="Agregar más archivos"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.zip"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFiles([...files, ...Array.from(e.target.files)]);
                    }
                  }}
                />
              </label>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-500 mb-6">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link
            href={`/materias/${materia.id}`}
            className="text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            ← Volver a la materia
          </Link>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/materias/${materia.id}/examen`}
              className="text-center border border-border px-4 py-3 sm:py-2 text-xs font-mono uppercase tracking-wider text-foreground-muted hover:border-accent"
            >
              Paso 2: Cargar examen
            </Link>
            <button
              onClick={handleUpload}
              disabled={uploading}
              aria-label="Guardar archivos"
              className="bg-accent text-background px-6 py-3 sm:py-2 text-sm uppercase tracking-wider hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Preparando..." : "Guardar archivos →"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
