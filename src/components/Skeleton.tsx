export function Bone({ className = "w-24" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`t-skeleton-line inline-block h-[0.7em] max-w-full rounded-xs align-middle ${className}`}
    />
  );
}

export function BoneBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`t-skeleton-line ${className}`} />;
}

export function SkeletonRegion({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className} aria-busy="true" data-skeleton="true">
      <span className="sr-only">Cargando…</span>
      {children}
    </div>
  );
}
