"use client";

import Link from "next/link";
import { useMemo } from "react";
import { defaultTitle } from "@/lib/tabs";
import { Icon } from "@/components/ui/Icon";
import { iconoPorKind } from "@/components/workspace/TabBar";
import { useRecientes } from "@/components/workspace/tabs-store";

const MAX_ITEMS = 4;

export function SeguirDondeDejaste({ materias }: { materias: { id: string; name: string }[] }) {
  const recientes = useRecientes();
  const items = useMemo(() => {
    const nombres = new Map(materias.map((materia) => [materia.id, materia.name]));
    return recientes
      .filter((item) => nombres.has(item.materiaId))
      .slice(0, MAX_ITEMS)
      .map((item) => ({ ...item, materiaName: nombres.get(item.materiaId) || item.materiaName }));
  }, [recientes, materias]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="seguir-titulo" className="mt-10">
      <h2 id="seguir-titulo" className="t-meta mb-3">
        Seguir donde dejaste
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
        {items.map((item) => (
          <li key={`${item.materiaId}|${item.href}`}>
            <Link
              href={item.href}
              className="flex h-14 items-center gap-3 rounded-md px-2 transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-hover text-foreground-muted">
                <Icon name={iconoPorKind(item.kind)} size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm leading-5 text-foreground">
                  {item.title || defaultTitle(item.kind)}
                </span>
                <span className="block truncate text-xs leading-4 text-foreground-muted">{item.materiaName}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
