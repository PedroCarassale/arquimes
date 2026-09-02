"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Material } from "@/lib/types";
import { ButtonLabel } from "@/components/Button";

interface MaterialesSectionProps {
  materiaId: string;
  materiales: Material[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string): string {
  if (type.includes("pdf")) return "PDF";
  if (type.includes("video")) return "VID";
  if (type.includes("image")) return "IMG";
  return "DOC";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

export function MaterialesSection({
  materiaId,
  materiales,
}: MaterialesSectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        await fetch(`/api/materias/${materiaId}/materiales`, {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        console.error("Error uploading file:", err);
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/materiales/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      console.error("Error deleting file:", err);
    }
    setDeleting(null);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl">Material de estudio</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.mp3,.wav"
            onChange={handleUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <ButtonLabel variant="secondary" size="sm" disabled={uploading}>
              {uploading ? "Subiendo..." : "Subir archivo"}
            </ButtonLabel>
          </label>
        </div>
      </div>

      {materiales.length === 0 ? (
        <div className="border border-border-subtle p-6 text-center">
          <p className="text-foreground-muted mb-2">
            No hay material subido todavía.
          </p>
          <p className="text-sm text-foreground-muted/70">
            Subí PDFs, apuntes, videos o cualquier archivo que uses para estudiar.
          </p>
        </div>
      ) : (
        <div className="border border-border-subtle divide-y divide-border-subtle">
          {materiales.map((material) => (
            <div
              key={material.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-surface-elevated transition-colors group"
            >
              <span className="font-mono text-xs text-foreground-muted w-8">
                {getFileIcon(material.type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm">{material.name}</p>
                <p className="text-xs text-foreground-muted font-mono">
                  {formatFileSize(material.size)} · {formatDate(material.addedAt)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(material.id)}
                disabled={deleting === material.id}
                className="text-foreground-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-sm"
              >
                {deleting === material.id ? "..." : "Eliminar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
