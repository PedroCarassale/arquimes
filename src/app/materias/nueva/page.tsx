"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

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
      const res = await apiFetch("/api/materias", {
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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="px-4 py-6 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8 sm:items-center">
          <div>
            <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
              Materias
            </div>
            <h1 className="font-serif text-2xl leading-tight sm:text-3xl">Crear o unirse a una materia</h1>
          </div>
          <Link
            href="/"
            className="shrink-0 text-sm border border-border px-3 py-2 hover:bg-surface transition-colors sm:px-4"
          >
            Entrada
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-12">
          <div className="border border-border p-5 sm:p-8">
            <div className="text-xs font-mono text-accent uppercase tracking-wider mb-4">
              Crear una materia
            </div>
            <h2 className="font-serif text-2xl mb-2">Empezá tu propio espacio</h2>
            <p className="text-sm text-foreground-muted mb-8">
              Cargá tus apuntes, prepará exámenes e invitá a otras personas cuando quieras.
            </p>

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="nombre-materia"
                  className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2"
                >
                  Nombre de la materia
                </label>
                <input
                  id="nombre-materia"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Análisis Matemático II"
                  autoComplete="off"
                  aria-label="Nombre de la materia"
                  className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="universidad"
                    className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2"
                  >
                    Universidad
                  </label>
                  <input
                    id="universidad"
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="UTN La Plata"
                    autoComplete="off"
                    aria-label="Universidad"
                    className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="carrera"
                    className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2"
                  >
                    Carrera
                  </label>
                  <input
                    id="carrera"
                    type="text"
                    placeholder="Ingeniería"
                    autoComplete="off"
                    aria-label="Carrera"
                    className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="catedra"
                  className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2"
                >
                  Cátedra · Opcional
                </label>
                <input
                  id="catedra"
                  type="text"
                  value={catedra}
                  onChange={(e) => setCatedra(e.target.value)}
                  placeholder="Agregar cátedra"
                  autoComplete="off"
                  aria-label="Cátedra"
                  className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-500">{error}</p>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                aria-label="Crear materia"
                className="w-full h-12 bg-accent text-background font-mono text-sm uppercase tracking-wider hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear materia →"}
              </button>
            </div>
          </div>

          <div className="border border-border-subtle p-5 opacity-40 sm:p-8">
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
