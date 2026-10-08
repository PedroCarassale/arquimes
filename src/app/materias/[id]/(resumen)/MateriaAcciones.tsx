"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { forgetMateria } from "@/lib/materia-snapshot";
import { crearNota } from "@/lib/notas-client";
import { rutas } from "@/lib/routes";
import { enqueueUploads, onUploadComplete } from "@/lib/upload-queue";
import { cx } from "@/components/ui/cx";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Menu } from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { TabLink } from "@/components/workspace/TabLink";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { forgetTabs } from "@/components/workspace/tabs-store";

type Accion = "clase" | "chat" | "subir" | "fecha";

function useAcciones() {
  const { materiaId, openChat } = useWorkspace();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [creando, setCreando] = useState(false);

  async function empezarClase() {
    if (creando) return;
    setCreando(true);
    try {
      const nota = await crearNota(materiaId, { titulo: "" });
      router.push(rutas.clase(materiaId, nota.id));
    } catch (error) {
      setCreando(false);
      toast({ message: error instanceof Error ? error.message : "No se pudo crear la clase.", tone: "error" });
    }
  }

  function run(accion: Exclude<Accion, "fecha">) {
    if (accion === "clase") void empezarClase();
    else if (accion === "chat") openChat({ focusComposer: true });
    else fileRef.current?.click();
  }

  const input = (
    <input
      ref={fileRef}
      type="file"
      multiple
      tabIndex={-1}
      aria-hidden="true"
      className="hidden"
      onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (files.length > 0) enqueueUploads(materiaId, files, { kind: "apuntes" });
      }}
    />
  );

  return { materiaId, creando, run, input };
}

export function RefrescarAlSubir() {
  const { materiaId } = useWorkspace();
  const router = useRouter();
  useEffect(() => {
    let timer: number | null = null;
    const off = onUploadComplete((item) => {
      if (item.materiaId !== materiaId || item.kind !== "apuntes") return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        router.refresh();
      }, 400);
    });
    return () => {
      off();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [materiaId, router]);
  return null;
}

type Tile = { accion: Accion; titulo: string; descripcion: string; icon: IconName; primaria?: boolean };

const TILES: Tile[] = [
  { accion: "clase", titulo: "Empezar clase", descripcion: "Arrancá a tomar apuntes", icon: "clase", primaria: true },
  { accion: "chat", titulo: "Preguntarle al chat", descripcion: "Sobre tus clases y apuntes", icon: "chat" },
  { accion: "subir", titulo: "Subir apuntes", descripcion: "PDF, fotos, videos o texto", icon: "upload" },
  { accion: "fecha", titulo: "Cargar fecha", descripcion: "Examen, entrega u otro", icon: "calendario" },
];

const TILE =
  "flex h-[84px] min-w-0 flex-col justify-between rounded-lg border px-4 py-3.5 text-left transition-colors duration-(--dur-fast) ease-(--ease-out) disabled:opacity-60 max-md:h-[72px]";

function TileContent({ tile, creando }: { tile: Tile; creando: boolean }) {
  return (
    <>
      <Icon name={tile.icon} size={18} className={tile.primaria ? "text-accent" : "text-foreground-muted"} />
      <span className="block min-w-0">
        <span className="block truncate text-sm font-medium leading-5 text-foreground">
          {tile.accion === "clase" && creando ? "Creando clase…" : tile.titulo}
        </span>
        <span className="block truncate text-xs leading-4 text-foreground-muted max-md:hidden">{tile.descripcion}</span>
      </span>
    </>
  );
}

export function AccionesMateria() {
  const { materiaId, creando, run, input } = useAcciones();
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 lg:@min-[680px]:grid-cols-4">
      {TILES.map((tile) => {
        const classes = cx(
          TILE,
          tile.primaria
            ? "border-transparent bg-accent-muted hover:bg-[rgba(243,164,75,0.2)]"
            : "border-border-subtle bg-surface hover:border-border hover:bg-surface-elevated"
        );
        if (tile.accion === "fecha") {
          return (
            <TabLink key={tile.accion} href={rutas.calendario(materiaId, { nuevo: true })} className={classes}>
              <TileContent tile={tile} creando={creando} />
            </TabLink>
          );
        }
        const accion = tile.accion;
        return (
          <button
            key={tile.accion}
            type="button"
            onClick={() => run(accion)}
            disabled={accion === "clase" && creando}
            aria-busy={(accion === "clase" && creando) || undefined}
            className={classes}
          >
            <TileContent tile={tile} creando={creando} />
          </button>
        );
      })}
      {input}
    </div>
  );
}

const PASOS: { accion: Exclude<Accion, "chat">; label: string; clave: "clase" | "apunte" | "fecha" }[] = [
  { accion: "clase", label: "Anotá tu primera clase", clave: "clase" },
  { accion: "subir", label: "Subí un PDF, foto o apunte", clave: "apunte" },
  { accion: "fecha", label: "Cargá la fecha del primer parcial", clave: "fecha" },
];

export function PrimerosPasos({ hechos }: { hechos: { clase: boolean; apunte: boolean; fecha: boolean } }) {
  const { materiaId, creando, run, input } = useAcciones();
  const row =
    "flex h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-hover pointer-coarse:h-12";

  return (
    <section aria-labelledby="primeros-pasos" className="mt-10 max-w-[560px] rounded-lg border border-border-subtle bg-surface p-5">
      <h2 id="primeros-pasos" className="t-meta mb-2 px-2">
        Primeros pasos
      </h2>
      <ul>
        {PASOS.map((paso) => {
          const hecho = hechos[paso.clave];
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cx(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  hecho ? "border-accent bg-accent text-[#0a0a0a]" : "border-foreground-subtle"
                )}
              >
                {hecho && <Icon name="check" size={12} />}
              </span>
              <span className={cx("min-w-0 flex-1 truncate", hecho ? "text-foreground-muted line-through" : "text-foreground")}>
                {paso.accion === "clase" && creando ? "Creando clase…" : paso.label}
              </span>
              <span className="sr-only">{hecho ? "(hecho)" : "(pendiente)"}</span>
              {!hecho && <Icon name="chevron-right" size={14} className="shrink-0 text-foreground-subtle" />}
            </>
          );
          return (
            <li key={paso.clave}>
              {hecho ? (
                <div className="flex h-11 w-full items-center gap-3 px-2 text-sm pointer-coarse:h-12">{content}</div>
              ) : paso.accion === "fecha" ? (
                <TabLink href={rutas.calendario(materiaId, { nuevo: true })} className={row}>
                  {content}
                </TabLink>
              ) : (
                <button
                  type="button"
                  className={row}
                  disabled={paso.accion === "clase" && creando}
                  onClick={() => run(paso.accion === "clase" ? "clase" : "subir")}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 px-2 text-[13px] leading-[18px] text-foreground-muted">El chat estudia con lo que cargues acá.</p>
      {input}
    </section>
  );
}

const INLINE = "whitespace-nowrap text-foreground underline-offset-4 transition-colors duration-(--dur-fast) hover:underline disabled:opacity-60";

export function AccionInline({ accion, children }: { accion: "clase" | "subir" | "fecha"; children: ReactNode }) {
  const { materiaId, creando, run, input } = useAcciones();
  if (accion === "fecha") {
    return (
      <TabLink href={rutas.calendario(materiaId, { nuevo: true })} className={INLINE}>
        {children}
      </TabLink>
    );
  }
  return (
    <>
      <button
        type="button"
        className={INLINE}
        disabled={accion === "clase" && creando}
        onClick={() => run(accion)}
      >
        {children}
      </button>
      {input}
    </>
  );
}

export function MateriaMenu({ materiaName }: { materiaName: string }) {
  const { materiaId } = useWorkspace();
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);

  async function borrar() {
    const response = await apiFetch(`/api/materias/${materiaId}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      toast({ message: "No se pudo borrar la materia.", tone: "error" });
      return;
    }
    setConfirmando(false);
    forgetTabs(materiaId);
    forgetMateria(materiaId);
    router.replace(rutas.inicio);
    router.refresh();
    toast({ message: `Se borró «${materiaName}»` });
  }

  return (
    <>
      <Menu
        label="Opciones de la materia"
        items={[{ label: "Borrar materia", icon: "trash", danger: true, onSelect: () => setConfirmando(true) }]}
        trigger={(props) => <IconButton icon="more" label="Opciones de la materia" size={32} {...props} />}
      />
      <ConfirmDialog
        open={confirmando}
        title={`¿Borrar «${materiaName}»?`}
        body="Se borran sus clases, apuntes y fechas. No se puede deshacer."
        onConfirm={borrar}
        onCancel={() => setConfirmando(false)}
      />
    </>
  );
}
