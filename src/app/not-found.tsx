"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { forgetTabs } from "@/components/workspace/tabs-store";
import { apiFetch } from "@/lib/api";
import { forgetMateria } from "@/lib/materia-snapshot";
import { rutas } from "@/lib/routes";

type Estado = { id: string; existe: boolean; name?: string };

function materiaIdFrom(pathname: string): { id: string; deep: boolean } | null {
  const match = pathname.match(/^\/materias\/([^/]+)(\/.*)?$/);
  if (!match || match[1] === "nueva") return null;
  return { id: decodeURIComponent(match[1]), deep: Boolean(match[2] && match[2] !== "/") };
}

export default function NotFound() {
  const pathname = usePathname();
  const ruta = materiaIdFrom(pathname ?? "");
  const [estado, setEstado] = useState<Estado | null>(null);
  const materiaId = ruta?.id ?? null;

  useEffect(() => {
    if (!materiaId) return;
    let cancelled = false;
    apiFetch(`/api/materias/${encodeURIComponent(materiaId)}`)
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404) {
          forgetTabs(materiaId);
          forgetMateria(materiaId);
          setEstado({ id: materiaId, existe: false });
          return;
        }
        if (!response.ok) return;
        const data = (await response.json()) as { name?: unknown };
        if (!cancelled) setEstado({ id: materiaId, existe: true, name: typeof data.name === "string" ? data.name : undefined });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [materiaId]);

  const actual = estado && estado.id === materiaId ? estado : null;
  const materiaFalta = Boolean(ruta && (actual ? !actual.existe : !ruta.deep));
  const materiaExiste = Boolean(ruta && actual?.existe);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[560px] px-4 pt-[12vh] md:px-8">
        <EmptyState
          icon="search"
          title={materiaFalta ? "Esa materia ya no existe." : "Esta página no existe."}
          description={
            materiaFalta
              ? "Puede que la hayas borrado o que el link esté viejo."
              : "Revisá el link o volvé a un lugar conocido."
          }
          action={
            materiaExiste && ruta ? (
              <ButtonLink href={rutas.materia(ruta.id)} variant="secondary" size="lg">
                {actual?.name ? `Ir a ${actual.name}` : "Ir a la materia"}
              </ButtonLink>
            ) : (
              <ButtonLink href={rutas.inicio} variant="secondary" size="lg">
                Ir al inicio
              </ButtonLink>
            )
          }
        />
      </div>
    </AppShell>
  );
}
