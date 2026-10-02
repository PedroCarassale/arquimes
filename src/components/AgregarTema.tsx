"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { MASTERY_LABELS, type Tema } from "@/lib/types";

export function AgregarTema({
  examenId,
  initialTemas,
}: {
  examenId: string;
  initialTemas: Tema[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temas, setTemas] = useState(initialTemas);

  async function addTema() {
    const name = draft.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/examenes/${examenId}/temas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || "No pude agregar el tema"
        );
      }
      setTemas((prev) => [...prev, data as Tema]);
      setDraft("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude agregar el tema");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border-subtle p-6 mb-8">
      <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
        Temas que entran
      </div>
      {temas.length === 0 ? (
        <p className="text-sm text-foreground-muted mb-4">
          Sin temas no hay práctica que mueva el preparado.
        </p>
      ) : (
        <ul className="mb-4 divide-y divide-border-subtle border border-border-subtle">
          {temas.map((tema) => (
            <li
              key={tema.id}
              className="p-3 flex items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0">{tema.name}</span>
              <span className="shrink-0 text-right text-xs font-mono uppercase text-foreground-muted">
                {MASTERY_LABELS[tema.masteryState]}
              </span>
            </li>
          ))}
        </ul>
      )}
      <label htmlFor="agregar-tema" className="sr-only">
        Agregar otro tema
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="agregar-tema"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTema();
            }
          }}
          placeholder="Espacios vectoriales"
          aria-label="Agregar otro tema"
          className="flex-1 px-3 py-3 sm:py-2 bg-surface border border-border text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={addTema}
          disabled={saving || !draft.trim()}
          aria-label="Agregar tema"
          className="px-4 py-3 sm:py-2 bg-accent text-background text-sm hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? "Agregando…" : "Agregar tema"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-500 mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
