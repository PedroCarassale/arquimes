"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { tabsStore } from "@/components/workspace/tabs-store";
import { rutas } from "@/lib/routes";
import { tabKey, tabKindFromPath, type TabKind } from "@/lib/tabs";

function missingMessage(kind: TabKind | null): string {
  if (kind === "clase") return "Esa clase ya no existe";
  if (kind === "archivo" || kind === "generado") return "Ese apunte ya no existe";
  if (kind === "evento") return "Ese evento ya no existe";
  return "Esa página ya no existe";
}

export default function MateriaNotFound() {
  const { materiaId } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const handled = useRef<string | null>(null);
  const kind = tabKindFromPath(materiaId, pathname);
  const message = missingMessage(kind);

  useEffect(() => {
    if (!kind || kind === "inicio") return;
    const key = tabKey(pathname);
    const frame = window.requestAnimationFrame(() => {
      if (handled.current === key) return;
      handled.current = key;
      toast({ message });
      const next = tabsStore.discard(materiaId, key);
      router.replace(next ?? rutas.materia(materiaId));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [materiaId, pathname, kind, message, router]);

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pt-[12vh] md:px-8">
      <EmptyState
        icon="search"
        title={`${message}.`}
        description="Puede que la hayas borrado o que el link esté viejo."
        action={
          <ButtonLink href={rutas.materia(materiaId)} variant="secondary" size="lg">
            Ir al inicio de la materia
          </ButtonLink>
        }
      />
    </div>
  );
}
