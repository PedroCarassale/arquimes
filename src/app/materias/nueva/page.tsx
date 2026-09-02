"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function CrearMateriaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [catedra, setCatedra] = useState("");

  async function handleCreate() {
    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/materias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          faculty: faculty.trim(),
          catedra: catedra.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear la materia");
      }

      const materia = await res.json();
      router.push(`/materias/${materia.id}/inicio`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
              Materias
            </div>
            <h1 className="font-serif text-3xl">Crear o unirse a una materia</h1>
          </div>
          <Link
            href="/"
            className="text-sm border border-border px-4 py-2 hover:bg-surface transition-colors"
          >
            Entrada
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-12">
          <div className="border border-border p-8">
            <div className="text-xs font-mono text-accent uppercase tracking-wider mb-4">
              Crear una materia
            </div>
            <h2 className="font-serif text-2xl mb-2">Empezá tu propio espacio</h2>
            <p className="text-sm text-foreground-muted mb-8">
              Cargá tus apuntes, prepará exámenes e invitá a otras personas cuando quieras.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                  Nombre de la materia
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Análisis Matemático II"
                  autoComplete="off"
                  className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                    Universidad
                  </label>
                  <input
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="UTN La Plata"
                    autoComplete="off"
                    className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                    Carrera
                  </label>
                  <input
                    type="text"
                    placeholder="Ingeniería"
                    autoComplete="off"
                    className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                  Cátedra · Opcional
                </label>
                <input
                  type="text"
                  value={catedra}
                  onChange={(e) => setCatedra(e.target.value)}
                  placeholder="Agregar cátedra"
                  autoComplete="off"
                  className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                className="w-full h-12 bg-accent text-background font-mono text-sm uppercase tracking-wider hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear materia →"}
              </button>
            </div>
          </div>

          <div className="border border-border-subtle p-8 opacity-40">
            <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-4">
              Unirme a una materia
            </div>
            <h2 className="font-serif text-2xl mb-2">Encontrá un espacio existente</h2>
            <p className="text-sm text-foreground-muted mb-8">
              Buscá por universidad y cátedra o ingresá un código de invitación.
            </p>
            <div className="text-sm text-foreground-subtle text-center py-8">
              Próximamente
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
