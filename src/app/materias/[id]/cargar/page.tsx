"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Materia } from "@/lib/types";
import { apiFetch } from "@/lib/api";

export default function CargarPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [materia, setMateria] = useState<Materia | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function loadMateria() {
      const res = await apiFetch(`/api/materias/${id}`);
      if (res.ok) {
        setMateria(await res.json());
      }
    }
    loadMateria();
  }, [id]);

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
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await apiFetch(`/api/materias/${id}/materiales`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (data as { error?: string }).error ||
              `No pude subir ${file.name}`
          );
        }
      }

      router.push(`/materias/${id}/apuntes`);
      router.refresh();
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
      <div className="p-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider">
            Carga de material
          </div>
          <div className="text-xs font-mono text-accent uppercase tracking-wider border border-accent px-3 py-1">
            Paso 1 de 5
          </div>
        </div>

        <h1 className="font-serif text-3xl mb-2">Seleccionar archivos</h1>
        {materia && (
          <p className="sr-only">Materia {materia.name}</p>
        )}

        <div className="mb-8">
          <h2 className="font-serif text-2xl text-foreground-muted mb-2">
            Sumá material a la materia
          </h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-muted">
              Podés cargar apuntes, guías, bibliografía, imágenes o documentos de clase.
            </p>
            <span className="text-xs font-mono text-foreground-muted">
              PDF · DOCX · PPTX · JPG · PNG · TXT
            </span>
          </div>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed p-16 mb-8 text-center transition-colors ${
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
              <h3 className="font-serif text-xl mb-2">Arrastrá los archivos acá</h3>
              <p className="text-sm text-foreground-muted mb-6">
                También podés seleccionar archivos desde tu computadora.
              </p>
              <div className="flex items-center justify-center gap-4">
                <label className="text-sm bg-accent text-background px-6 py-2 cursor-pointer hover:bg-accent/90 transition-colors uppercase tracking-wider">
                  Explorar archivos
                  <input
                    type="file"
                    multiple
                    aria-label="Explorar archivos"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm"
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
                    className="flex items-center gap-4 py-2 border-b border-border-subtle"
                  >
                    <span className="text-xs font-mono text-foreground-muted w-8">
                      {file.type.includes("pdf")
                        ? "PDF"
                        : file.type.includes("image")
                        ? "IMG"
                        : "DOC"}
                    </span>
                    <span className="flex-1 text-sm">{file.name}</span>
                    <span className="text-xs text-foreground-muted">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-xs text-foreground-muted hover:text-red-500"
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
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm"
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

        <div className="grid grid-cols-3 gap-8 mb-8 py-6 border-t border-border-subtle">
          <div>
            <div className="text-accent text-xs font-mono uppercase tracking-wider mb-1">01</div>
            <div className="text-sm font-medium mb-1">Seleccionás el material</div>
          </div>
          <div>
            <div className="text-foreground-muted text-xs font-mono uppercase tracking-wider mb-1">02</div>
            <div className="text-sm text-foreground-muted mb-1">Arquimes lo organiza</div>
          </div>
          <div>
            <div className="text-foreground-muted text-xs font-mono uppercase tracking-wider mb-1">03</div>
            <div className="text-sm text-foreground-muted mb-1">Queda listo para estudiar</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/materias/${id}`}
            className="text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            ← Volver a la materia
          </Link>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            aria-label="Continuar"
            className="bg-accent text-background px-6 py-2 text-sm uppercase tracking-wider hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Subiendo..." : "Continuar →"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
