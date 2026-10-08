import type { ReactNode } from "react";
import type { ArtefactoTipo } from "@/lib/types";
import { inferMaterialViewerKind } from "@/lib/material-viewer";

export type IconName =
  | "home"
  | "clase"
  | "apunte"
  | "generado"
  | "calendario"
  | "chat"
  | "panel"
  | "plus"
  | "x"
  | "search"
  | "upload"
  | "download"
  | "trash"
  | "more"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "check"
  | "copy"
  | "bookmark"
  | "clock"
  | "pdf"
  | "imagen"
  | "texto"
  | "video"
  | "examen"
  | "entrega"
  | "evento"
  | "sparkle"
  | "link"
  | "menu";

export type IconSize = 12 | 14 | 16 | 18 | 20 | 24;

const DOC = "M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z";
const DOC_FOLD = "M14 3.5V8h4.5";
const TRAY = "M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15";

const dot = (cx: number, cy: number) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.25" fill="currentColor" stroke="none" />;

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9v9.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V9" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  clase: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 3.5v17" />
      <path d="M12.5 8.5h3M12.5 12h3" />
    </>
  ),
  apunte: (
    <>
      <path d={DOC} />
      <path d={DOC_FOLD} />
    </>
  ),
  generado: (
    <>
      <path d={DOC} />
      <path d={DOC_FOLD} />
      <path d="M12 10.5l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" />
    </>
  ),
  calendario: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16" />
      <path d="M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  chat: <path d="M19.5 11.5a7.5 7.5 0 0 1-11 6.6L4.5 19.5l1.2-3.8a7.5 7.5 0 1 1 13.8-4.2z" />,
  panel: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9.5 4.5v15" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15.5v-11" />
      <path d="M7.5 9 12 4.5 16.5 9" />
      <path d={TRAY} />
    </>
  ),
  download: (
    <>
      <path d="M12 4.5v11" />
      <path d="M7.5 11 12 15.5 16.5 11" />
      <path d={TRAY} />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6.5 7l.8 11.6a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  more: <>{[dot(6, 12), dot(12, 12), dot(18, 12)]}</>,
  "chevron-down": <path d="M6.5 9.5 12 15l5.5-5.5" />,
  "chevron-left": <path d="M14.5 6.5 9 12l5.5 5.5" />,
  "chevron-right": <path d="M9.5 6.5 15 12l-5.5 5.5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  bookmark: <path d="M7 4.5h10a1 1 0 0 1 1 1v14l-6-4-6 4v-14a1 1 0 0 1 1-1z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </>
  ),
  pdf: (
    <>
      <path d={DOC} />
      <path d={DOC_FOLD} />
      <path d="M9 17.5v-5h1.75a1.5 1.5 0 0 1 0 3H9" />
      <path d="M14 17.5h1.5" />
    </>
  ),
  imagen: (
    <>
      <rect x="4" y="4.5" width="16" height="15" rx="2" />
      <circle cx="9" cy="9.5" r="1.5" />
      <path d="M20 15.5 15.5 11 6 19.5" />
    </>
  ),
  texto: (
    <>
      <path d={DOC} />
      <path d={DOC_FOLD} />
      <path d="M9 12h6M9 15h6M9 18h3.5" />
    </>
  ),
  video: (
    <>
      <rect x="3.5" y="6" width="12.5" height="12" rx="2" />
      <path d="M16 10.5 20.5 8v8L16 13.5" />
    </>
  ),
  examen: (
    <>
      <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
      <path d="M9.5 3.5h5v2.5h-5z" />
      <path d="M9 13l2 2 4-4" />
    </>
  ),
  entrega: (
    <>
      <path d="M4.5 13.5h4l1.5 2.5h4l1.5-2.5h4" />
      <path d="M4.5 13.5 7 6h10l2.5 7.5V18a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
    </>
  ),
  evento: (
    <>
      <path d="M6 20.5v-16" />
      <path d="M6 5h10.5l-2 3.5 2 3.5H6" />
    </>
  ),
  sparkle: (
    <>
      <path d="M11 3.5l1.7 4.8 4.8 1.7-4.8 1.7L11 16.5l-1.7-4.8-4.8-1.7 4.8-1.7z" />
      <path d="M18 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </>
  ),
  menu: <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />,
};

export function Icon({ name, size = 16, className }: { name: IconName; size?: IconSize; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={["shrink-0", className].filter(Boolean).join(" ")}
    >
      {PATHS[name]}
    </svg>
  );
}

const ICON_NAMES = new Set<string>(Object.keys(PATHS));

export function isIconName(value: unknown): value is IconName {
  return typeof value === "string" && ICON_NAMES.has(value);
}

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "mkv", "avi", "ogv"]);

export function fileIconName(mime: string, fileName: string): "pdf" | "imagen" | "texto" | "video" | "apunte" {
  const type = (mime || "").toLowerCase();
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (type.startsWith("video/") || (!type && VIDEO_EXTENSIONS.has(extension))) return "video";
  const kind = inferMaterialViewerKind(mime, fileName);
  if (kind === "pdf") return "pdf";
  if (kind === "image") return "imagen";
  if (kind === "text") return "texto";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return "apunte";
}

type ApunteIconInput =
  | { origen: "archivo"; name: string; type: string; esExamen: boolean }
  | { origen: "generado"; tipo: ArtefactoTipo };

export function apunteIconName(item: ApunteIconInput): IconName {
  if (item.origen === "archivo") return item.esExamen ? "examen" : fileIconName(item.type, item.name);
  return item.tipo === "examen" ? "examen" : "generado";
}
