"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export function EliminarExamen({
  examId,
  materiaId,
}: {
  examId: string;
  materiaId: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/examenes/${examId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || "No pude eliminar el examen."
        );
      }
      router.push(`/materias/${materiaId}/examenes`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No pude eliminar el examen."
      );
      setDeleting(false);
      setConfirm(false);
    }
  }

  return (
    <div className="mt-12 pt-6 border-t border-border-subtle">
      {error && (
        <p role="alert" className="text-sm text-red-500 mb-4">
          {error}
        </p>
      )}
      {confirm ? (
        <div role="alertdialog" aria-label="Confirmar eliminación">
          <p className="text-sm text-foreground-muted mb-4">
            ¿Eliminar este examen y su archivo? Esta acción no se puede
            deshacer.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="text-sm border border-border px-4 py-2 hover:border-foreground-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Confirmar eliminar examen"
              className="text-sm text-red-500 border border-red-500/40 px-4 py-2 hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleting ? "Eliminando..." : "Eliminar examen"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          aria-label="Eliminar examen"
          className="text-sm text-foreground-muted hover:text-red-500"
        >
          Eliminar este examen
        </button>
      )}
    </div>
  );
}
