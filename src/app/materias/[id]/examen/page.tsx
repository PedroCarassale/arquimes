"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Materia } from "@/lib/types";

const SUGGESTED_TEMAS = [
  "Límites y continuidad",
  "Derivadas",
  "Aplicaciones de la derivada",
  "Integrales",
  "Integrales definidas",
  "Series y sucesiones",
  "Ecuaciones diferenciales",
];

export default function CrearExamenPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [materia, setMateria] = useState<Materia | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"parcial" | "final">("parcial");
  const [name, setName] = useState("Primer parcial");
  const [date, setDate] = useState("");
  const [modality, setModality] = useState("Escrito · presencial");
  const [selectedTemas, setSelectedTemas] = useState<string[]>([]);
  const [customTema, setCustomTema] = useState("");

  useEffect(() => {
    async function loadMateria() {
      const res = await fetch(`/api/materias/${id}`);
      if (res.ok) {
        setMateria(await res.json());
      }
    }
    loadMateria();
  }, [id]);

  function toggleTema(tema: string) {
    if (selectedTemas.includes(tema)) {
      setSelectedTemas(selectedTemas.filter((t) => t !== tema));
    } else {
      setSelectedTemas([...selectedTemas, tema]);
    }
  }

  function addCustomTema() {
    if (customTema.trim() && !selectedTemas.includes(customTema.trim())) {
      setSelectedTemas([...selectedTemas, customTema.trim()]);
      setCustomTema("");
    }
  }

  async function handleCreate() {
    if (!date) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/materias/${id}/examenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          date,
          modality,
          temas: selectedTemas,
        }),
      });

      if (res.ok) {
        router.push(`/materias/${id}`);
      }
    } catch (err) {
      console.error("Error creating exam:", err);
    }

    setLoading(false);
  }

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider">
            Preparación de examen
          </div>
          <div className="text-xs font-mono text-accent uppercase tracking-wider border border-accent px-3 py-1">
            Paso 1 de 3
          </div>
        </div>

        <h1 className="font-serif text-3xl mb-8">Crear examen objetivo</h1>

        <div>
          <div className="grid grid-cols-[1fr_320px] gap-12">
            <div>
              <h2 className="font-serif text-2xl mb-6">¿Qué examen vas a preparar?</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setType("parcial")}
                  className={`p-4 text-left border transition-colors ${
                    type === "parcial"
                      ? "border-accent bg-accent-muted/20"
                      : "border-border hover:border-foreground-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-lg">Parcial</span>
                    {type === "parcial" && (
                      <span className="w-4 h-4 rounded-full bg-accent" />
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setType("final")}
                  className={`p-4 text-left border transition-colors ${
                    type === "final"
                      ? "border-accent bg-accent-muted/20"
                      : "border-border hover:border-foreground-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-lg">Final</span>
                    {type === "final" && (
                      <span className="w-4 h-4 rounded-full bg-accent" />
                    )}
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                    Materia
                  </label>
                  <div className="h-12 px-4 bg-surface border border-border text-foreground flex items-center">
                    {materia?.name || "Cargando..."}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Primer parcial"
                    className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full h-12 px-4 bg-surface border border-border text-foreground focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                    Modalidad
                  </label>
                  <select
                    value={modality}
                    onChange={(e) => setModality(e.target.value)}
                    className="w-full h-12 px-4 bg-surface border border-border text-foreground focus:outline-none focus:border-accent"
                  >
                    <option>Escrito · presencial</option>
                    <option>Escrito · virtual</option>
                    <option>Oral · presencial</option>
                    <option>Oral · virtual</option>
                    <option>Multiple choice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                  Objetivo personal
                </label>
                <input
                  type="text"
                  placeholder="Ejemplo: llegar pudiendo resolver un parcial completo sin ayuda."
                  className="w-full h-12 px-4 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-mono text-foreground-muted uppercase tracking-wider mb-2">
                Temas incluidos
              </div>
              <h3 className="font-serif text-xl mb-4">Seleccioná lo que entra</h3>

              <div className="space-y-2 mb-4">
                {SUGGESTED_TEMAS.map((tema) => (
                  <button
                    key={tema}
                    type="button"
                    onClick={() => toggleTema(tema)}
                    className={`w-full text-left p-3 border transition-colors flex items-center gap-3 ${
                      selectedTemas.includes(tema)
                        ? "border-accent bg-accent-muted/20"
                        : "border-border-subtle hover:border-border"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 border flex items-center justify-center text-xs ${
                        selectedTemas.includes(tema)
                          ? "border-accent bg-accent text-background"
                          : "border-foreground-muted"
                      }`}
                    >
                      {selectedTemas.includes(tema) && "✓"}
                    </span>
                    <span className="text-sm">{tema}</span>
                  </button>
                ))}

                {selectedTemas
                  .filter((t) => !SUGGESTED_TEMAS.includes(t))
                  .map((tema) => (
                    <button
                      key={tema}
                      type="button"
                      onClick={() => toggleTema(tema)}
                      className="w-full text-left p-3 border border-accent bg-accent-muted/20 transition-colors flex items-center gap-3"
                    >
                      <span className="w-4 h-4 border border-accent bg-accent text-background flex items-center justify-center text-xs">
                        ✓
                      </span>
                      <span className="text-sm">{tema}</span>
                    </button>
                  ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTema}
                  onChange={(e) => setCustomTema(e.target.value)}
                  placeholder="Agregar otro tema..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTema();
                    }
                  }}
                  className="flex-1 h-10 px-3 bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent text-sm"
                />
                <button
                  type="button"
                  onClick={addCustomTema}
                  className="px-3 h-10 border border-border text-sm text-foreground-muted hover:text-foreground hover:border-foreground-muted transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-12 pt-6 border-t border-border-subtle">
            <Link
              href={`/materias/${id}`}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              ← Volver a la materia
            </Link>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!date || loading}
              className="bg-accent text-background px-6 py-2 text-sm uppercase tracking-wider hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : "Continuar →"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
