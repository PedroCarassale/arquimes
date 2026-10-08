"use client";

import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Pill } from "@/components/ui";
import type { Tema } from "@/lib/types";

function separar(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((tema) => tema.trim())
    .filter(Boolean);
}

export function TemasChips({
  temas,
  onAdd,
  onRemove,
}: {
  temas: Tema[];
  onAdd: (names: string[]) => Promise<boolean>;
  onRemove: (tema: Tema) => void;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function agregar(raw: string) {
    const existentes = new Set(temas.map((tema) => tema.name.toLocaleLowerCase("es")));
    const nombres = [...new Set(separar(raw))].filter((name) => !existentes.has(name.toLocaleLowerCase("es")));
    if (nombres.length === 0) {
      setDraft("");
      return;
    }
    setBusy(true);
    const ok = await onAdd(nombres);
    setBusy(false);
    if (ok) setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!busy) void agregar(draft);
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!/[\n,;]/.test(text)) return;
    event.preventDefault();
    if (!busy) void agregar(`${draft}${text}`);
  }

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-1.5">
      {temas.map((tema) => (
        <Pill key={tema.id} onRemove={() => onRemove(tema)} removeLabel={`Quitar «${tema.name}»`}>
          {tema.name}
        </Pill>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        aria-busy={busy || undefined}
        aria-label="Agregar tema"
        enterKeyHint="done"
        placeholder={temas.length ? "Agregar tema" : "Agregá los temas que entran"}
        className="h-7 min-w-[160px] flex-1 rounded-sm bg-transparent px-1.5 text-[13px] text-foreground outline-none transition-colors duration-(--dur-fast) ease-(--ease-out) placeholder:text-foreground-subtle hover:bg-hover focus:bg-hover focus-visible:shadow-none"
      />
    </div>
  );
}
