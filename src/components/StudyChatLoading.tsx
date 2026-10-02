export function StudyChatLoadingThread() {
  return (
    <div aria-label="Cargando conversación" className="space-y-4">
      <div className="max-w-[72%] rounded-2xl border border-border bg-surface-elevated p-4">
        <div className="t-skeleton-line h-3 w-24 rounded-full" />
        <div className="mt-3 t-skeleton-line h-2.5 w-full rounded-full" />
        <div className="mt-2 t-skeleton-line h-2.5 w-5/6 rounded-full" />
      </div>
      <div className="ml-auto max-w-[66%] rounded-2xl bg-accent/20 p-4">
        <div className="t-skeleton-line h-2.5 w-full rounded-full" />
        <div className="mt-2 t-skeleton-line h-2.5 w-3/4 rounded-full" />
      </div>
    </div>
  );
}

export function StudyChatLoadingSessions({ count }: { count: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mb-2 border border-border-subtle p-2">
          <div className="text-sm">
            <span className="t-skeleton-line inline-block h-[0.7em] w-32 rounded-sm align-middle" />
          </div>
          <div className="text-xs font-mono mt-1">
            <span className="t-skeleton-line inline-block h-[0.7em] w-28 rounded-sm align-middle" />
          </div>
          <div className="mt-2 flex gap-2 text-xs text-foreground-muted">
            <span>Renombrar</span>
            <span>Borrar</span>
          </div>
        </div>
      ))}
    </div>
  );
}
