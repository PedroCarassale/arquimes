"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { tamanoArchivo } from "@/app/materias/[id]/apuntes/apunte-format";
import { onUploadComplete, usePendingUploads, type UploadKind } from "@/lib/upload-queue";

export function SubidasDeMateria({
  materiaId,
  kind,
  onComplete,
}: {
  materiaId: string;
  kind: UploadKind;
  onComplete?: () => void;
}) {
  const router = useRouter();
  const uploads = usePendingUploads(materiaId, kind);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(
    () =>
      onUploadComplete((item) => {
        if (item.materiaId !== materiaId || item.kind !== kind) return;
        if (onCompleteRef.current) onCompleteRef.current();
        else router.refresh();
      }),
    [materiaId, kind, router]
  );

  if (uploads.length === 0) return null;

  return (
    <ul aria-label="Subidas en curso" className="flex flex-col">
      {uploads.map((item) => {
        const saving = item.status === "subiendo" && item.fraction >= 0.99;
        const label =
          item.status === "pendiente"
            ? "En cola"
            : saving
              ? "Guardando…"
              : `Subiendo · ${Math.round(item.fraction * 100)}%`;
        return (
          <li key={item.id} className="flex h-[52px] items-center gap-3 rounded-md px-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-hover text-foreground-muted">
              <Icon name="upload" size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-foreground">{item.name}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-hover">
                  <span
                    className="block h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${Math.max(2, Math.round(item.fraction * 100))}%` }}
                  />
                </span>
                <span className="shrink-0 font-mono text-[11px] text-foreground-subtle">
                  {label} · {tamanoArchivo(item.size)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function SinSubidasPendientes({
  materiaId,
  kind,
  children,
}: {
  materiaId: string;
  kind: UploadKind;
  children: React.ReactNode;
}) {
  return usePendingUploads(materiaId, kind).length ? null : <>{children}</>;
}
