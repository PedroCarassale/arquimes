"use client";

import { useWorkspace } from "./WorkspaceContext";

export function PedirAlChat({
  texto,
  label,
  send = true,
  className,
}: {
  texto: string;
  label?: string;
  send?: boolean;
  className?: string;
}) {
  const { askChat } = useWorkspace();
  return (
    <button
      type="button"
      onClick={() => askChat(texto, { send })}
      className={
        className ??
        "border border-border-subtle px-3 py-2 text-left text-sm text-foreground-muted transition-colors hover:border-accent hover:text-foreground"
      }
    >
      {label ?? texto}
    </button>
  );
}
