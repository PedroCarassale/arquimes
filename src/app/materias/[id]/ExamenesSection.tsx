"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExamenEnPreparacion,
  Tema,
  MASTERY_LABELS,
  MASTERY_ORDER,
  MasteryState,
} from "@/lib/types";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

interface ExamenWithTemas extends ExamenEnPreparacion {
  temas: Tema[];
}

interface ExamenesSectionProps {
  materiaId: string;
  examenes: ExamenWithTemas[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getMasteryColor(state: MasteryState): string {
  switch (state) {
    case "dominado":
      return "text-accent";
    case "estudiado":
      return "text-accent/70";
    case "necesita_practica":
      return "text-amber-500";
    case "empezado":
      return "text-foreground-muted";
    default:
      return "text-foreground-muted/50";
  }
}

export function ExamenesSection({
  materiaId,
  examenes,
}: ExamenesSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingTemaTo, setAddingTemaTo] = useState<string | null>(null);
  const [newTemaName, setNewTemaName] = useState("");

  async function handleCreateExamen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const type = formData.get("type") as string;
    const date = formData.get("date") as string;
    const modality = formData.get("modality") as string;
    const temasRaw = formData.get("temas") as string;

    const temas = temasRaw
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await fetch(`/api/materias/${materiaId}/examenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, date, modality, temas }),
      });
      setShowForm(false);
      router.refresh();
    } catch (err) {
      console.error("Error creating exam:", err);
    }

    setLoading(false);
  }

  async function handleAddTema(examenId: string) {
    if (!newTemaName.trim()) return;

    try {
      await fetch(`/api/examenes/${examenId}/temas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTemaName.trim() }),
      });
      setNewTemaName("");
      setAddingTemaTo(null);
      router.refresh();
    } catch (err) {
      console.error("Error adding tema:", err);
    }
  }

  async function handleUpdateMastery(temaId: string, masteryState: MasteryState) {
    try {
      await fetch(`/api/temas/${temaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masteryState }),
      });
      router.refresh();
    } catch (err) {
      console.error("Error updating mastery:", err);
    }
  }

  async function handleDeleteTema(temaId: string) {
    try {
      await fetch(`/api/temas/${temaId}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      console.error("Error deleting tema:", err);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl">Exámenes</h2>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            Cargar examen
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateExamen}
          className="border border-border p-4 mb-6 bg-surface space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm text-foreground-muted">Tipo</label>
              <select
                name="type"
                required
                className="w-full h-10 px-3 bg-surface-elevated border border-border text-foreground focus:outline-none focus:border-accent"
              >
                <option value="parcial">Parcial</option>
                <option value="final">Final</option>
              </select>
            </div>
            <Input name="date" type="date" label="Fecha" required />
          </div>

          <Input
            name="modality"
            label="Modalidad (opcional)"
            placeholder="ej. Presencial, Virtual, Múltiple choice"
          />

          <div className="space-y-1.5">
            <label className="block text-sm text-foreground-muted">
              Temas (opcional, separados por coma o salto de línea)
            </label>
            <textarea
              name="temas"
              rows={3}
              placeholder="ej. Derivadas&#10;Integrales&#10;Límites"
              className="w-full p-3 bg-surface-elevated border border-border text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {examenes.length === 0 && !showForm ? (
        <div className="border border-border-subtle p-6 text-center">
          <p className="text-foreground-muted mb-2">
            No tenés exámenes cargados.
          </p>
          <p className="text-sm text-foreground-muted/70">
            Cargá tu próximo parcial o final para hacer seguimiento de tu preparación.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {examenes.map((examen) => (
            <div key={examen.id} className="border border-border-subtle">
              <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <span className="font-medium">
                    {examen.type === "parcial" ? "Parcial" : "Final"}
                  </span>
                  <span className="text-foreground-muted ml-2 font-mono text-sm">
                    {formatDate(examen.date)}
                  </span>
                  {examen.modality && (
                    <span className="text-foreground-muted/60 ml-2 text-sm">
                      · {examen.modality}
                    </span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-border-subtle">
                {examen.temas.map((tema) => (
                  <div
                    key={tema.id}
                    className="px-4 py-2 flex items-center gap-4 hover:bg-surface-elevated transition-colors group"
                  >
                    <span className="flex-1 text-sm">{tema.name}</span>
                    <select
                      value={tema.masteryState}
                      onChange={(e) =>
                        handleUpdateMastery(tema.id, e.target.value as MasteryState)
                      }
                      className={`bg-transparent border-none text-sm font-mono focus:outline-none cursor-pointer ${getMasteryColor(
                        tema.masteryState
                      )}`}
                    >
                      {MASTERY_ORDER.map((state) => (
                        <option key={state} value={state} className="text-foreground bg-surface">
                          {MASTERY_LABELS[state]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDeleteTema(tema.id)}
                      className="text-foreground-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {addingTemaTo === examen.id ? (
                  <div className="px-4 py-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={newTemaName}
                      onChange={(e) => setNewTemaName(e.target.value)}
                      placeholder="Nombre del tema"
                      autoFocus
                      className="flex-1 bg-transparent border-b border-border focus:border-accent outline-none text-sm py-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTema(examen.id);
                        }
                        if (e.key === "Escape") {
                          setAddingTemaTo(null);
                          setNewTemaName("");
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddTema(examen.id)}
                      className="text-accent text-sm hover:underline"
                    >
                      Agregar
                    </button>
                    <button
                      onClick={() => {
                        setAddingTemaTo(null);
                        setNewTemaName("");
                      }}
                      className="text-foreground-muted text-sm hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTemaTo(examen.id)}
                    className="w-full px-4 py-2 text-left text-sm text-foreground-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
                  >
                    + Agregar tema
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
