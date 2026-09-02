"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export default function NuevaMateriaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const faculty = formData.get("faculty") as string;
    const catedra = formData.get("catedra") as string;

    try {
      const res = await fetch("/api/materias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, faculty, catedra }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear la materia");
      }

      const materia = await res.json();
      router.push(`/materias/${materia.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <Link
          href="/materias"
          className="text-sm text-foreground-muted hover:text-foreground transition-colors"
        >
          ← Volver a materias
        </Link>
      </div>

      <h1 className="font-serif text-2xl sm:text-3xl mb-8">Nueva materia</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          name="name"
          label="Nombre de la materia"
          placeholder="ej. Análisis Matemático I"
          required
          autoFocus
        />

        <Input
          name="faculty"
          label="Facultad (opcional)"
          placeholder="ej. Ingeniería"
        />

        <Input
          name="catedra"
          label="Cátedra (opcional)"
          placeholder="ej. García"
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear materia"}
          </Button>
          <Link href="/materias">
            <Button type="button" variant="ghost">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
