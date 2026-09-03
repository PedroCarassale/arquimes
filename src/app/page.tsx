import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function HomePage() {
  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <h1 className="font-serif text-4xl">Tus materias</h1>
          <div className="text-sm text-foreground-muted capitalize">{today}</div>
        </div>

        <div className="border border-border p-12 text-center">
          <p className="text-foreground-muted mb-6">
            No tenés materias todavía.
          </p>
          <Link
            href="/materias/nueva"
            className="inline-flex items-center gap-2 bg-accent text-background px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            + Crear materia
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
