"use client";

import { useEffect, useSyncExternalStore } from "react";

export interface MateriaSnapshot {
  name?: string;
  info?: string;
  materialesCount?: number;
  materiaIds?: string[];
}

const STORAGE_KEY = "arquimedes:materia-snapshots";

export const HUB_KEY = "__hub";

let snapshots: Map<string, MateriaSnapshot> | null = null;
const listeners = new Set<() => void>();

function load(): Map<string, MateriaSnapshot> {
  if (snapshots) return snapshots;
  snapshots = new Map();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, MateriaSnapshot>;
      for (const [id, value] of Object.entries(parsed)) snapshots.set(id, value);
    }
  } catch {}
  return snapshots;
}

function persist(map: Map<string, MateriaSnapshot>) {
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(map))
    );
  } catch {}
}

function commit(next: Map<string, MateriaSnapshot>) {
  snapshots = next;
  persist(next);
  for (const listener of listeners) listener();
}

export function rememberMateria(id: string, patch: MateriaSnapshot) {
  const map = load();
  const previous = map.get(id);
  const next = { ...previous, ...patch };
  const changed =
    !previous ||
    (Object.keys(patch) as (keyof MateriaSnapshot)[]).some(
      (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key])
    );
  if (!changed) return;
  commit(new Map(map).set(id, next));
}

export function forgetMateria(id: string) {
  const map = load();
  const hub = map.get(HUB_KEY);
  if (!map.has(id) && !hub?.materiaIds?.includes(id)) return;
  const next = new Map(map);
  next.delete(id);
  if (hub?.materiaIds) {
    next.set(HUB_KEY, { ...hub, materiaIds: hub.materiaIds.filter((item) => item !== id) });
  }
  commit(next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMateriaSnapshots(): Map<string, MateriaSnapshot> | undefined {
  return useSyncExternalStore(subscribe, load, () => undefined);
}

export function useMateriaSnapshot(id: string | undefined): MateriaSnapshot | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (id ? load().get(id) : undefined),
    () => undefined
  );
}

export function useRememberMateria(id: string, patch: MateriaSnapshot) {
  const serialized = JSON.stringify(patch);
  useEffect(() => {
    rememberMateria(id, JSON.parse(serialized) as MateriaSnapshot);
  }, [id, serialized]);
}

export function RememberMateria({
  id,
  snapshot,
}: {
  id: string;
  snapshot: MateriaSnapshot;
}) {
  useRememberMateria(id, snapshot);
  return null;
}

export function RememberMaterias({
  items,
}: {
  items: { id: string; snapshot: MateriaSnapshot }[];
}) {
  const serialized = JSON.stringify(items);
  useEffect(() => {
    const parsed = JSON.parse(serialized) as typeof items;
    for (const item of parsed) {
      rememberMateria(item.id, item.snapshot);
    }
    rememberMateria(HUB_KEY, { materiaIds: parsed.map((item) => item.id) });
  }, [serialized]);
  return null;
}
