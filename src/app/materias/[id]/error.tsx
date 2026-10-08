"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MateriaError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pt-[12vh] md:px-8">
      <EmptyState
        title="Algo salió mal."
        description="No pudimos mostrar esta pestaña. Probá de nuevo en un momento."
        action={
          <Button variant="secondary" size="lg" onClick={() => retry()}>
            Reintentar
          </Button>
        }
      />
    </div>
  );
}
