"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLANTILLA_CLASE, crearNota, tituloNuevaClase } from "@/lib/notas-client";

export function NuevaNotaButtons({ materiaId, compact = false }: { materiaId: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(clase: boolean) {
    setBusy(true);
    setError(null);
    try {
      const nota = await crearNota(
        materiaId,
        clase ? { titulo: tituloNuevaClase(), contenido: PLANTILLA_CLASE } : { titulo: "Nota sin título" }
      );
      router.push(`/materias/${materiaId}/notas/${nota.id}?editar=1`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude crear la nota.");
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void create(true)}
        className="px-2 py-1 font-mono text-xs uppercase tracking-wider text-accent hover:bg-surface disabled:opacity-50"
        title="Nueva clase"
      >
        + Clase
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void create(true)}
        className="bg-accent px-4 py-2 text-sm text-background hover:bg-accent/90 disabled:opacity-60"
      >
        + Nueva clase
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void create(false)}
        className="border border-border px-4 py-2 text-sm text-foreground-muted hover:border-accent hover:text-foreground disabled:opacity-60"
      >
        Nota en blanco
      </button>
      {error && <span className="text-sm text-red-300">{error}</span>}
    </div>
  );
}
