"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";
import { rutas } from "@/lib/routes";

const LABEL = "mb-1.5 block text-[13px] leading-[18px] text-foreground-muted";

export default function NuevaMateriaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [catedra, setCatedra] = useState("");
  const [faculty, setFaculty] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!name.trim()) {
      setError("Poné un nombre.");
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data?.id !== "string") {
        throw new Error(data?.error || "No se pudo crear la materia.");
      }
      router.push(rutas.materia(data.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la materia.");
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[480px] px-4 pb-16 pt-10 md:px-8 md:pt-[12vh]">
        <h1 className="t-doc-title">Nueva materia</h1>
        <p className="mt-2 text-sm leading-6 text-foreground-muted">
          Acá vas a guardar tus clases, apuntes y fechas de esta materia.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
          <div>
            <label htmlFor="materia-nombre" className={LABEL}>
              Nombre
            </label>
            <Input
              id="materia-nombre"
              size="lg"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Análisis Matemático II"
              autoComplete="off"
              autoFocus
              required
              invalid={Boolean(error) && !name.trim()}
              aria-describedby={error ? "materia-error" : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-3">
            <div>
              <label htmlFor="materia-catedra" className={LABEL}>
                Cátedra <span className="text-foreground-subtle">· opcional</span>
              </label>
              <Input
                id="materia-catedra"
                size="lg"
                value={catedra}
                onChange={(event) => setCatedra(event.target.value)}
                placeholder="Cátedra Sadosky"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="materia-facultad" className={LABEL}>
                Facultad <span className="text-foreground-subtle">· opcional</span>
              </label>
              <Input
                id="materia-facultad"
                size="lg"
                value={faculty}
                onChange={(event) => setFaculty(event.target.value)}
                placeholder="FCEN · UBA"
                autoComplete="off"
              />
            </div>
          </div>

          {error && (
            <p id="materia-error" role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full sm:w-auto">
            {loading ? "Creando…" : "Crear materia"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
