"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatFileSize } from "@/lib/format";
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
    <ul className="mb-4 border border-border-subtle divide-y divide-border-subtle">
      {uploads.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-3">
          <span className="w-8 shrink-0 text-xs font-mono text-foreground-muted">↑</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">{item.name}</div>
            <div className="text-[11px] font-mono text-accent">
              {item.status === "pendiente"
                ? "En cola"
                : `Subiendo · ${Math.round(item.fraction * 100)}%`}{" "}
              · {formatFileSize(item.size)}
            </div>
          </div>
        </li>
      ))}
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
