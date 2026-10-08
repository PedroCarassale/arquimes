"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { SinSubidasPendientes, SubidasDeMateria } from "@/components/SubidasDeMateria";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  IconButton,
  Input,
  Menu,
  Popover,
  SegmentedControl,
  apunteIconName,
  cx,
  toast,
  type MenuItem,
} from "@/components/ui";
import { TabLink } from "@/components/workspace/TabLink";
import { normalizeSearch } from "@/components/workspace/TabBar";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { useTabs } from "@/components/workspace/tabs-store";
import { apiFetch } from "@/lib/api";
import { useRememberMateria } from "@/lib/materia-snapshot";
import { materialFileUrl } from "@/lib/material-viewer";
import { rutas } from "@/lib/routes";
import { expandStudyFiles, rereadStudyFile, validateStudyFile } from "@/lib/study-upload";
import type { ApunteItem } from "@/lib/types";
import { enqueueUploads } from "@/lib/upload-queue";
import { enLectura, lecturaEstado, metaArchivo, metaGenerado } from "./apunte-format";

export type ApuntesTipo = "todos" | "archivos" | "generados";
export type ApuntesOrden = "recientes" | "nombre";

type ArchivoItem = Extract<ApunteItem, { origen: "archivo" }>;

const ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.jpg,.jpeg,.png,.gif,.webp,.heic,.mp4,.mov,.webm,.m4v,.zip";
const POLL_MS = 4000;

const TIPO_OPTIONS: { value: ApuntesTipo; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "archivos", label: "Archivos" },
  { value: "generados", label: "Del chat" },
];

const ORDEN_OPTIONS: { value: ApuntesOrden; label: string }[] = [
  { value: "recientes", label: "Recientes" },
  { value: "nombre", label: "Nombre" },
];

function apunteTitle(item: ApunteItem): string {
  return item.origen === "archivo" ? item.name : item.titulo;
}

function apunteHref(materiaId: string, item: ApunteItem): string {
  return item.origen === "archivo" ? rutas.archivo(materiaId, item.id) : rutas.generado(materiaId, item.id);
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export function ApuntesLibrary({
  materiaId,
  initialItems,
  tipo: tipoProp,
  orden: ordenProp,
}: {
  materiaId: string;
  initialItems: ApunteItem[];
  tipo: ApuntesTipo;
  orden: ApuntesOrden;
}) {
  const { refreshToken, bumpRefresh } = useWorkspace();
  const { close } = useTabs();
  const [items, setItems] = useState(initialItems);
  const [tipo, setTipo] = useState(tipoProp);
  const [orden, setOrden] = useState(ordenProp);
  const [synced, setSynced] = useState({ initialItems, tipoProp, ordenProp });
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [borrando, setBorrando] = useState<ApunteItem | null>(null);
  const dragDepth = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const firstToken = useRef(refreshToken);

  if (synced.initialItems !== initialItems || synced.tipoProp !== tipoProp || synced.ordenProp !== ordenProp) {
    if (synced.initialItems !== initialItems) setItems(initialItems);
    if (synced.tipoProp !== tipoProp) setTipo(tipoProp);
    if (synced.ordenProp !== ordenProp) setOrden(ordenProp);
    setSynced({ initialItems, tipoProp, ordenProp });
  }

  const archivosCount = items.filter((item) => item.origen === "archivo").length;
  useRememberMateria(materiaId, { materialesCount: archivosCount });

  const reload = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/materias/${materiaId}/apuntes`);
      if (response.ok) setItems((await response.json()) as ApunteItem[]);
    } catch {}
  }, [materiaId]);

  useEffect(() => {
    if (refreshToken === firstToken.current) return;
    void reload();
  }, [refreshToken, reload]);

  const reading = items.some((item) => item.origen === "archivo" && enLectura(item.lectura));
  useEffect(() => {
    if (!reading) return;
    const timer = window.setInterval(() => void reload(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [reading, reload]);

  const visible = useMemo(() => {
    const needle = normalizeSearch(query.trim());
    const list = items.filter((item) => {
      if (tipo === "archivos" && item.origen !== "archivo") return false;
      if (tipo === "generados" && item.origen !== "generado") return false;
      return !needle || normalizeSearch(apunteTitle(item)).includes(needle);
    });
    if (orden === "nombre") {
      list.sort((a, b) => apunteTitle(a).localeCompare(apunteTitle(b), "es", { sensitivity: "base", numeric: true }));
    }
    return list;
  }, [items, tipo, orden, query]);

  function updateUrl(nextTipo: ApuntesTipo, nextOrden: ApuntesOrden) {
    const href = rutas.apuntes(materiaId, {
      tipo: nextTipo === "todos" ? undefined : nextTipo,
      orden: nextOrden === "nombre" ? "nombre" : undefined,
    });
    window.history.replaceState(null, "", href);
  }

  function changeTipo(next: ApuntesTipo) {
    setTipo(next);
    updateUrl(next, orden);
  }

  function changeOrden(next: ApuntesOrden) {
    setOrden(next);
    updateUrl(tipo, next);
  }

  async function upload(list: File[]) {
    if (list.length === 0) return;
    try {
      const files = await expandStudyFiles(list);
      const invalid = files.map(validateStudyFile).find(Boolean);
      const valid = files.filter((file) => !validateStudyFile(file));
      if (invalid) toast({ message: invalid, tone: "error" });
      if (valid.length) enqueueUploads(materiaId, valid, { kind: "apuntes" });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "No se pudo subir el archivo.", tone: "error" });
    }
  }

  async function reread(item: ArchivoItem) {
    if (!item.fileId) return;
    try {
      const lectura = await rereadStudyFile(item.fileId, item.name);
      setItems((current) =>
        current.map((entry) => (entry.origen === "archivo" && entry.id === item.id ? { ...entry, lectura } : entry))
      );
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "No se pudo volver a leer el archivo.", tone: "error" });
    }
  }

  async function confirmDelete() {
    const item = borrando;
    if (!item) return;
    const url = item.origen === "archivo" ? `/api/materiales/${item.id}` : `/api/artefactos/${item.id}`;
    try {
      const response = await apiFetch(url, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "No se pudo borrar.");
      }
      setItems((current) => current.filter((entry) => !(entry.origen === item.origen && entry.id === item.id)));
      const href = apunteHref(materiaId, item);
      close(href, { deleted: true });
      bumpRefresh();
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "No se pudo borrar.", tone: "error" });
    } finally {
      setBorrando(null);
    }
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void upload(Array.from(event.dataTransfer.files));
  }

  const openPicker = () => fileRef.current?.click();
  const trimmedQuery = query.trim();

  return (
    <div
      className="relative min-h-full"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPT}
        aria-label="Elegir archivos"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void upload(files);
        }}
      />

      <div className="mx-auto w-full max-w-[880px] px-4 pb-16 pt-6 md:px-8 md:pt-10">
        <h1 className="t-doc-title text-foreground">Apuntes</h1>
        <p className="mt-1 text-sm text-foreground-muted">Tus archivos y lo que guardaste del chat.</p>

        {items.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1 sm:min-w-40 sm:max-w-80">
              <Icon
                name="search"
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle"
              />
              <Input
                ref={searchRef}
                type="text"
                role="searchbox"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && query) {
                    event.preventDefault();
                    setQuery("");
                  }
                }}
                placeholder="Buscar en apuntes"
                aria-label="Buscar en apuntes"
                autoComplete="off"
                className={cx("pl-8", query && "pr-8")}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Borrar búsqueda"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-foreground-subtle transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover hover:text-foreground pointer-coarse:h-8 pointer-coarse:w-8"
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
            <SegmentedControl
              value={tipo}
              options={TIPO_OPTIONS}
              onChange={changeTipo}
              ariaLabel="Qué mostrar"
              className="max-sm:order-2"
            />
            <OrdenMenu value={orden} onChange={changeOrden} className="max-sm:order-3" />
            <Button variant="secondary" icon="upload" onClick={openPicker} className="ml-auto max-sm:order-1">
              Subir
            </Button>
          </div>
        )}

        <div className="mt-4">
          <SubidasDeMateria materiaId={materiaId} kind="apuntes" />

          {items.length === 0 ? (
            <SinSubidasPendientes materiaId={materiaId} kind="apuntes">
              <button
                type="button"
                onClick={openPicker}
                className="mt-2 flex h-[200px] w-full flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-border px-6 text-center transition-colors duration-(--dur-fast) ease-(--ease-out) hover:border-border-strong hover:bg-hover"
              >
                <span className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-hover text-foreground-muted">
                  <Icon name="upload" size={20} />
                </span>
                <span className="text-sm text-foreground">Arrastrá PDFs, fotos o apuntes, o elegí archivos</span>
                <span className="text-[13px] text-foreground-muted">El chat va a poder estudiar con esto.</span>
              </button>
            </SinSubidasPendientes>
          ) : visible.length === 0 ? (
            <FiltroVacio query={trimmedQuery} tipo={tipo} onUpload={openPicker} />
          ) : (
            <ul className="flex flex-col">
              {visible.map((item) => (
                <ApunteRow
                  key={`${item.origen}-${item.id}`}
                  materiaId={materiaId}
                  item={item}
                  onDelete={() => setBorrando(item)}
                  onReread={item.origen === "archivo" ? () => void reread(item) : undefined}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {dragging && (
        <div
          aria-hidden="true"
          className="t-fade-in pointer-events-none absolute inset-4 z-20 flex justify-center rounded-xl border-[1.5px] border-dashed border-border-strong bg-background/85"
        >
          <div className="sticky top-[30vh] flex h-fit flex-col items-center gap-3 pt-[20vh]">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-hover text-foreground">
              <Icon name="upload" size={24} />
            </span>
            <span className="font-serif text-[22px] leading-7 text-foreground">Soltá los archivos acá</span>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={borrando !== null}
        title={borrando ? `¿Borrar «${apunteTitle(borrando)}»?` : ""}
        body="No se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setBorrando(null)}
      />
    </div>
  );
}

function OrdenMenu({
  value,
  onChange,
  className,
}: {
  value: ApuntesOrden;
  onChange: (next: ApuntesOrden) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const current = ORDEN_OPTIONS.find((option) => option.value === value) ?? ORDEN_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>("[aria-checked=true]")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    buttons[(index + delta + buttons.length) % buttons.length]?.focus();
  }

  return (
    <>
      <Button
        ref={setAnchor}
        variant="ghost"
        iconRight="chevron-down"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Ordenar por: ${current.label}`}
        className={cx("px-2.5", className)}
      >
        {current.label}
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={anchor} placement="bottom-end" width={180} title="Ordenar por">
        <div ref={listRef} role="menu" aria-label="Ordenar por" onKeyDown={onKeyDown} className="p-1">
          <p className="t-meta px-2 pb-1 pt-1.5 max-md:hidden">Ordenar por</p>
          {ORDEN_OPTIONS.map((option) => {
            const checked = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                onClick={() => {
                  setOpen(false);
                  onChange(option.value);
                }}
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-foreground outline-none transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-selected focus:bg-selected focus-visible:shadow-none pointer-coarse:h-11"
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {checked && <Icon name="check" size={16} className="text-foreground-muted" />}
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}

function FiltroVacio({ query, tipo, onUpload }: { query: string; tipo: ApuntesTipo; onUpload: () => void }) {
  if (query) return <EmptyState size="sm" icon="search" title={`Nada coincide con «${query}».`} />;
  if (tipo === "generados") {
    return (
      <EmptyState
        size="sm"
        icon="generado"
        title="Todavía no guardaste nada del chat."
        description="Usá «Guardar en apuntes» en una respuesta del chat, o pedile un resumen o un simulacro."
      />
    );
  }
  return (
    <EmptyState
      size="sm"
      icon="upload"
      title="Todavía no subiste apuntes."
      action={
        <Button variant="secondary" icon="upload" onClick={onUpload}>
          Subir
        </Button>
      }
    />
  );
}

function ApunteRow({
  materiaId,
  item,
  onDelete,
  onReread,
}: {
  materiaId: string;
  item: ApunteItem;
  onDelete: () => void;
  onReread?: () => void;
}) {
  const archivo = item.origen === "archivo" ? (item as ArchivoItem) : null;
  const estado = archivo ? lecturaEstado(archivo.lectura) : null;
  const leyendo = archivo ? enLectura(archivo.lectura) : false;
  const meta = archivo ? metaArchivo(archivo) : item.origen === "generado" ? metaGenerado(item) : "";
  const title = apunteTitle(item);

  const menuItems: MenuItem[] = [];
  if (archivo) {
    menuItems.push({
      label: "Descargar",
      icon: "download",
      onSelect: () => {
        const link = document.createElement("a");
        link.href = materialFileUrl(materiaId, archivo.id, { download: true });
        link.download = archivo.name;
        link.click();
      },
    });
    if (onReread && archivo.fileId && (archivo.lectura?.estado === "parcial" || archivo.lectura?.estado === "sin-texto")) {
      menuItems.push({ label: "Volver a leer", icon: "sparkle", onSelect: onReread });
    }
    menuItems.push({ separator: true });
  }
  menuItems.push({ label: "Borrar", icon: "trash", danger: true, onSelect: onDelete });

  return (
    <li className="group flex h-[52px] items-center rounded-md transition-colors duration-(--dur-fast) ease-(--ease-out) focus-within:bg-hover hover:bg-hover">
      <TabLink
        href={apunteHref(materiaId, item)}
        tabTitle={title}
        className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-md pl-2 pr-2"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-hover text-foreground-muted">
          <Icon name={apunteIconName(item)} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm leading-5 text-foreground">{title}</span>
          <span className="block truncate font-mono text-[11px] leading-4 text-foreground-subtle">
            {meta}
            {estado && <span className="sm:hidden"> · {estado}</span>}
          </span>
        </span>
        {estado && (
          <span
            className={cx(
              "hidden shrink-0 font-mono text-[11px] sm:inline",
              leyendo ? "text-foreground-muted" : "text-foreground-subtle"
            )}
          >
            {estado}
          </span>
        )}
      </TabLink>
      <Menu
        label="Acciones del apunte"
        trigger={(props) => (
          <IconButton
            {...props}
            icon="more"
            label="Más acciones"
            size={28}
            className="mr-2 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 aria-expanded:opacity-100 max-md:opacity-100 pointer-coarse:opacity-100"
          />
        )}
        items={menuItems}
      />
    </li>
  );
}
