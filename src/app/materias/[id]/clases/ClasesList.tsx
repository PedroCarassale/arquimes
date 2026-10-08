"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog, IconButton, Menu, toast } from "@/components/ui";
import { TabLink } from "@/components/workspace/TabLink";
import { useTabs } from "@/components/workspace/tabs-store";
import { apiFetch } from "@/lib/api";
import { rutas } from "@/lib/routes";

export type ClaseFila = { id: string; titulo: string; fecha: string; extracto: string };
export type GrupoClases = { mes: string; clases: ClaseFila[] };

export function ClasesList({ materiaId, grupos }: { materiaId: string; grupos: GrupoClases[] }) {
  const router = useRouter();
  const { close } = useTabs();
  const [borrando, setBorrando] = useState<ClaseFila | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [borradas, setBorradas] = useState<ReadonlySet<string>>(() => new Set());

  async function borrar(clase: ClaseFila) {
    const response = await apiFetch(`/api/notas/${clase.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      toast({ message: "No se pudo borrar la clase.", tone: "error" });
      return;
    }
    setBorradas((actual) => new Set(actual).add(clase.id));
    setConfirmando(false);
    close(rutas.clase(materiaId, clase.id), { deleted: true });
    router.refresh();
  }

  const visibles = grupos
    .map((grupo) => ({ ...grupo, clases: grupo.clases.filter((clase) => !borradas.has(clase.id)) }))
    .filter((grupo) => grupo.clases.length > 0);

  return (
    <>
      <div className="mt-6">
        {visibles.map((grupo) => (
          <section key={grupo.mes} aria-label={grupo.mes} className="pt-4">
            <h2 className="t-meta px-3 pb-1.5">{grupo.mes}</h2>
            <ul>
              {grupo.clases.map((clase) => (
                <li
                  key={clase.id}
                  className="group relative flex items-center rounded-md transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover has-[[aria-expanded=true]]:bg-hover"
                >
                  <TabLink
                    href={rutas.clase(materiaId, clase.id)}
                    tabTitle={clase.titulo}
                    className="flex h-[52px] min-w-0 flex-1 items-center gap-4 rounded-md pl-3 pr-12 outline-none"
                  >
                    <span className="w-12 shrink-0 font-mono text-[11px] leading-4 text-foreground-subtle">
                      {clase.fecha}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm leading-5 text-foreground">{clase.titulo}</span>
                      {clase.extracto && (
                        <span className="truncate text-xs leading-4 text-foreground-muted">{clase.extracto}</span>
                      )}
                    </span>
                  </TabLink>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-(--dur-fast) group-hover:opacity-100 group-focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 pointer-coarse:opacity-100">
                    <Menu
                      label={`Opciones de «${clase.titulo}»`}
                      items={[
                        {
                          label: "Borrar",
                          icon: "trash",
                          danger: true,
                          onSelect: () => {
                            setBorrando(clase);
                            setConfirmando(true);
                          },
                        },
                      ]}
                      trigger={(props) => <IconButton icon="more" label="Más opciones" size={28} {...props} />}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={confirmando}
        title={`¿Borrar «${borrando?.titulo ?? ""}»?`}
        body="No se puede deshacer."
        onConfirm={() => (borrando ? borrar(borrando) : undefined)}
        onCancel={() => setConfirmando(false)}
      />
    </>
  );
}
