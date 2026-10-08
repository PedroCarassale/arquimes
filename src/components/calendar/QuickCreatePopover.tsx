"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Button, Input, Popover } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { EVALUACION_ERRORES } from "@/lib/evaluacion-input";
import { rutas } from "@/lib/routes";
import type { EvaluacionKind, ExamenEnPreparacion, ExamType } from "@/lib/types";
import { isYmd, kindPlaceholder, normalizeHora } from "./eventos";
import { TipoChips } from "./TipoChips";
import type { CalendarScope } from "./types";

const ULTIMA_MATERIA_KEY = "arq.calendario.ultimaMateria";
const ULTIMA_MATERIA_EVENT = "arq-calendario-ultima-materia";

function readUltimaMateria(): string | null {
  try {
    return window.localStorage.getItem(ULTIMA_MATERIA_KEY);
  } catch {
    return null;
  }
}

function writeUltimaMateria(id: string) {
  try {
    window.localStorage.setItem(ULTIMA_MATERIA_KEY, id);
  } catch {}
  window.dispatchEvent(new Event(ULTIMA_MATERIA_EVENT));
}

function subscribeUltimaMateria(callback: () => void) {
  window.addEventListener(ULTIMA_MATERIA_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ULTIMA_MATERIA_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const LABEL = "mb-1 block font-mono text-[11px] uppercase leading-4 tracking-[0.06em] text-foreground-subtle";

function QuickCreateForm({
  scope,
  fecha: fechaInicial,
  onClose,
  onCreated,
}: {
  scope: CalendarScope;
  fecha: string;
  onClose: () => void;
  onCreated?: (evento: { id: string; materiaId: string; name: string; date: string }) => void;
}) {
  const router = useRouter();
  const ultimaMateria = useSyncExternalStore(subscribeUltimaMateria, readUltimaMateria, () => null);
  const [materiaElegida, setMateriaElegida] = useState<string | null>(null);
  const [kind, setKind] = useState<EvaluacionKind>("examen");
  const [type, setType] = useState<ExamType | undefined>(undefined);
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(fechaInicial);
  const [hora, setHora] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"guardar" | "detalles" | null>(null);

  const materias = scope.tipo === "global" ? scope.materias : [];
  const materiaId =
    scope.tipo === "materia"
      ? scope.materiaId
      : materiaElegida ??
        (ultimaMateria && materias.some((materia) => materia.id === ultimaMateria) ? ultimaMateria : materias[0]?.id);

  async function guardar(detalles: boolean) {
    if (saving) return;
    const name = nombre.trim();
    if (!name) {
      setError(EVALUACION_ERRORES.nombre);
      return;
    }
    if (!isYmd(fecha)) {
      setError("Elegí una fecha.");
      return;
    }
    const horaNormal = normalizeHora(hora);
    if (horaNormal === null) {
      setError(EVALUACION_ERRORES.hora);
      return;
    }
    if (!materiaId) {
      setError("Elegí una materia.");
      return;
    }
    setError(null);
    setSaving(detalles ? "detalles" : "guardar");
    try {
      const response = await apiFetch(`/api/materias/${materiaId}/evaluaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name,
          type: kind === "examen" ? type : undefined,
          date: fecha,
          hora: horaNormal || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<ExamenEnPreparacion> & { error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error || "No se pudo guardar.");
      if (scope.tipo === "global") writeUltimaMateria(materiaId);
      onClose();
      if (detalles) {
        router.push(rutas.evento(materiaId, payload.id));
      } else {
        router.refresh();
        onCreated?.({ id: payload.id, materiaId, name, date: fecha });
      }
    } catch (err) {
      setSaving(null);
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void guardar(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 p-3" noValidate>
      {scope.tipo === "global" && (
        <label className="block">
          <span className={LABEL}>Materia</span>
          <select
            value={materiaId ?? ""}
            onChange={(event) => setMateriaElegida(event.target.value)}
            className="h-8 w-full min-w-0 rounded-md border border-border-subtle bg-surface px-2.5 text-sm text-foreground outline-none transition-colors duration-(--dur-fast) ease-(--ease-out) [color-scheme:dark] hover:border-border"
          >
            {materias.map((materia) => (
              <option key={materia.id} value={materia.id}>
                {materia.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <TipoChips
        kind={kind}
        type={type}
        onChange={(nextKind, nextType) => {
          setKind(nextKind);
          setType(nextType);
        }}
      />

      <label className="block">
        <span className={LABEL}>Nombre</span>
        <Input
          autoFocus
          value={nombre}
          invalid={error === EVALUACION_ERRORES.nombre}
          onChange={(event) => {
            setNombre(event.target.value);
            if (error) setError(null);
          }}
          placeholder={kindPlaceholder(kind)}
          maxLength={200}
        />
      </label>

      <div className="flex gap-2">
        <label className="block min-w-0 flex-1">
          <span className={LABEL}>Fecha</span>
          <Input
            type="date"
            value={fecha}
            required
            onChange={(event) => setFecha(event.target.value)}
            className="[color-scheme:dark]"
          />
        </label>
        <label className="block w-[88px] shrink-0">
          <span className={LABEL}>Hora</span>
          <Input
            value={hora}
            invalid={error === EVALUACION_ERRORES.hora}
            onChange={(event) => {
              setHora(event.target.value);
              if (error) setError(null);
            }}
            onBlur={() => {
              const normal = normalizeHora(hora);
              if (normal) setHora(normal);
            }}
            placeholder="HH:MM"
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            className="font-mono"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-[13px] leading-5 text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          iconRight="chevron-right"
          loading={saving === "detalles"}
          disabled={saving !== null}
          onClick={() => void guardar(true)}
        >
          Más detalles
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={saving === "guardar"} disabled={saving !== null}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

export function QuickCreatePopover({
  open,
  anchor,
  scope,
  fecha,
  onClose,
  onCreated,
}: {
  open: boolean;
  anchor: HTMLElement | null;
  scope: CalendarScope;
  fecha: string;
  onClose: () => void;
  onCreated?: (evento: { id: string; materiaId: string; name: string; date: string }) => void;
}) {
  return (
    <Popover open={open} onClose={onClose} anchor={anchor} placement="bottom-start" width={320} title="Nuevo evento">
      <QuickCreateForm scope={scope} fecha={fecha} onClose={onClose} onCreated={onCreated} />
    </Popover>
  );
}
