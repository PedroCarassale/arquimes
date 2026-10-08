"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast, type ButtonSize } from "@/components/ui";
import { crearNota } from "@/lib/notas-client";
import { rutas } from "@/lib/routes";

export function NuevaNotaButtons({
  materiaId,
  compact = false,
  label = "Nueva clase",
  size,
}: {
  materiaId: string;
  compact?: boolean;
  label?: string;
  size?: ButtonSize;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const nota = await crearNota(materiaId, { titulo: "" });
      router.push(rutas.clase(materiaId, nota.id));
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "No se pudo crear la clase.", tone: "error" });
      setBusy(false);
    }
  }

  return (
    <Button
      variant={compact ? "ghost" : "primary"}
      size={size ?? (compact ? "sm" : "md")}
      icon="plus"
      loading={busy}
      onClick={() => void create()}
    >
      {label}
    </Button>
  );
}
