"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { formatFileSize } from "@/lib/format";
import type { Materia } from "@/lib/types";

export function ExamenForm({ materia }: { materia: Materia }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function takeFiles(list: FileList | null) {
    if (list && list.length > 0) {
      setFile(list[0]);
      setError(null);
    }
  }

  async function handleSave() {
    setError(null);
    if (!file) {
      setError("Adjuntá el archivo del examen.");
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      if (note.trim()) body.append("note", note.trim());

      const res = await apiFetch(`/api/materias/${materia.id}/examenes`, {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || "No pude guardar el examen."
        );
      }

      router.push(`/materias/${materia.id}/examenes`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pude guardar el examen."
      );
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="px-4 py-6 sm:p-6 lg:p-8 max-w-2xl">
        <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
          {materia.name}
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl mb-2">Cargar examen</h1>
        <p className="text-sm text-foreground-muted mb-8">
          Paso 2 de 3: subí el archivo del próximo examen. Sumá una nota corta
          de contexto y después agregá temas para practicar.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            takeFiles(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed p-6 sm:p-10 mb-6 text-center transition-colors ${
            isDragging
              ? "border-accent bg-accent-muted/10"
              : file
                ? "border-accent/50"
                : "border-border hover:border-foreground-muted"
          }`}
        >
          {file ? (
            <div>
              <p className="font-serif text-xl mb-1 [overflow-wrap:anywhere]">{file.name}</p>
              <p className="text-sm text-foreground-muted mb-4">
                {formatFileSize(file.size)}
              </p>
              <label className="text-accent text-sm cursor-pointer hover:underline">
                Cambiar archivo
                <input
                  type="file"
                  aria-label="Archivo del examen"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                  onChange={(e) => takeFiles(e.target.files)}
                />
              </label>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-xl mb-2">
                <span className="sm:hidden">Subí el archivo del examen</span>
                <span className="hidden sm:inline">Arrastrá el archivo acá</span>
              </h2>
              <p className="text-sm text-foreground-muted mb-6">
                PDF, imagen o documento. Hasta 15 MB por archivo.
              </p>
              <label className="inline-block text-sm bg-accent text-background px-6 py-2 cursor-pointer hover:bg-accent/90 uppercase tracking-wider">
                Elegir archivo
                <input
                  type="file"
                  aria-label="Archivo del examen"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                  onChange={(e) => takeFiles(e.target.files)}
                />
              </label>
            </>
          )}
        </div>

        <label
          htmlFor="examen-nota"
          className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2"
        >
          De qué trata
        </label>
        <input
          id="examen-nota"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Parcial 2023, final diciembre…"
          aria-label="De qué trata"
          className="w-full h-12 px-4 mb-6 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
        />

        {error && (
          <p role="alert" className="text-sm text-red-500 mb-6">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-border-subtle">
          <Link
            href={`/materias/${materia.id}/cargar`}
            className="text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            ← Paso 1: Cargar apuntes
          </Link>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/materias/${materia.id}/examenes`}
              className="text-center border border-border px-4 py-3 sm:py-2 text-xs font-mono uppercase tracking-wider text-foreground-muted hover:border-accent"
            >
              Paso 3: Definir temas
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              aria-label="Guardar examen"
              className="bg-accent text-background px-6 py-3 sm:py-2 text-sm uppercase tracking-wider hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : "Guardar examen →"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
