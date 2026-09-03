"use client";

import { useState, useCallback } from "react";
import { MateriaLayout } from "@/components/MateriaLayout";
import { Material, Materia } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { formatFileSize } from "@/lib/format";

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffHours < 1) return "Hace un momento";
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function getFileIcon(type: string): string {
  if (type.includes("pdf")) return "PDF";
  if (type.includes("image")) return "IMG";
  if (type.includes("video")) return "VID";
  if (type.includes("word") || type.includes("doc")) return "DOC";
  return "FILE";
}

export function ApuntesLibrary({
  materia,
  initialMateriales,
}: {
  materia: Materia;
  initialMateriales: Material[];
}) {
  const [materiales, setMateriales] = useState<Material[]>(initialMateriales);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMateriales = useCallback(async () => {
    const res = await apiFetch(`/api/materias/${materia.id}/materiales`);
    if (res.ok) {
      setMateriales(await res.json());
    }
  }, [materia.id]);

  async function handleUpload(files: FileList) {
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await apiFetch(`/api/materias/${materia.id}/materiales`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (data as { error?: string }).error || `No pude subir ${file.name}`
          );
        }
      }
      await loadMateriales();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude subir el archivo");
    } finally {
      setUploading(false);
    }
  }

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
      handleUpload(e.dataTransfer.files);
    }
  }

  async function handleDelete(materialId: string) {
    try {
      const res = await apiFetch(`/api/materiales/${materialId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || "No pude eliminar el archivo"
        );
      }
      await loadMateriales();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pude eliminar el archivo"
      );
    }
  }

  const materiaInfo = [materia.faculty, materia.catedra]
    .filter(Boolean)
    .join(" · ");

  const collections = [
    { label: "Todos los archivos", count: materiales.length, active: true },
    {
      label: "Mis apuntes",
      count: materiales.filter((m) => m.type.includes("pdf")).length,
    },
    {
      label: "Bibliografía",
      count: 0,
      disabled: true,
    },
    {
      label: "Imágenes",
      count: materiales.filter((m) => m.type.includes("image")).length,
    },
  ];

  const usedBytes = materiales.reduce((acc, m) => acc + m.size, 0);

  return (
    <MateriaLayout
      materiaId={materia.id}
      materiaName={materia.name}
      materiaInfo={materiaInfo || "Privada"}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl mb-1">Apuntes y material</h2>
          <p className="text-sm text-foreground-muted">
            Guardá PDFs, imágenes y documentos dentro de esta materia.
          </p>
        </div>
        <label className="text-sm bg-accent text-background px-4 py-2 cursor-pointer hover:bg-accent/90 transition-colors text-center">
          Cargar apuntes
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-6">
          <div>
            <h3 className="font-serif text-lg mb-3">Colecciones</h3>
            <div className="text-xs text-foreground-muted mb-3">
              {materiales.length} elementos
            </div>
            <div className="space-y-1">
              {collections.map((col) => (
                <button
                  key={col.label}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                    col.active
                      ? "bg-surface-elevated text-foreground"
                      : col.disabled
                      ? "text-foreground-subtle cursor-not-allowed"
                      : "text-foreground-muted hover:text-foreground hover:bg-surface"
                  }`}
                  disabled={col.disabled}
                >
                  <span>{col.label}</span>
                  <span className="text-xs text-foreground-muted">
                    · {col.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border-subtle pt-4">
            <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
              Almacenamiento
            </div>
            <div className="text-sm text-foreground-muted">
              {formatFileSize(usedBytes)} usados
            </div>
          </div>
        </div>

        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed p-8 mb-6 text-center transition-colors ${
              isDragging
                ? "border-accent bg-accent-muted/10"
                : "border-border hover:border-foreground-muted"
            }`}
          >
            <h3 className="font-serif text-lg mb-2">
              {uploading ? "Subiendo..." : "Soltá archivos para cargarlos"}
            </h3>
            <p className="text-sm text-foreground-muted mb-4">
              PDF, texto o imágenes chicas · Hasta 12 KB por archivo en esta sesión
            </p>
            <label className="text-accent text-sm cursor-pointer hover:underline">
              Elegir archivos →
              <input
                type="file"
                multiple
                aria-label="Elegir archivos"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
            </label>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-500 mb-4">
              {error}
            </p>
          )}

          {materiales.length === 0 ? (
            <div className="text-center py-12 text-foreground-muted">
              No hay archivos todavía. Arrastrá archivos o hacé clic en
              &quot;Cargar apuntes&quot;.
            </div>
          ) : (
            <div className="border border-border-subtle overflow-x-auto">
              <div className="grid grid-cols-[1fr_80px_120px_80px] gap-4 px-4 py-2 text-xs font-mono text-foreground-muted uppercase tracking-wider border-b border-border-subtle min-w-[480px]">
                <div>Archivo</div>
                <div>Tamaño</div>
                <div>Subido</div>
                <div className="text-right">Acción</div>
              </div>
              {materiales.map((material) => (
                <div
                  key={material.id}
                  className="grid grid-cols-[1fr_80px_120px_80px] gap-4 px-4 py-3 items-center border-b border-border-subtle last:border-b-0 hover:bg-surface transition-colors group min-w-[480px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-foreground-muted w-8 shrink-0">
                      {getFileIcon(material.type)}
                    </span>
                    <div className="text-sm truncate">{material.name}</div>
                  </div>
                  <div className="text-sm text-foreground-muted">
                    {formatFileSize(material.size)}
                  </div>
                  <div className="text-sm text-foreground-muted">
                    {formatRelativeDate(material.addedAt)}
                  </div>
                  <div className="text-right flex items-center justify-end gap-3">
                    <a
                      href={`/api/materiales/${material.id}`}
                      className="text-xs text-accent hover:underline"
                    >
                      Abrir →
                    </a>
                    <button
                      onClick={() => handleDelete(material.id)}
                      className="text-xs text-foreground-muted hover:text-red-500"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MateriaLayout>
  );
}
