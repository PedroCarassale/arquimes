import { cookies } from "next/headers";
import { v4 as uuid } from "uuid";
import {
  Materia,
  Material,
  ExamenEnPreparacion,
  Tema,
  MasteryState,
  ExamType,
} from "./types";

const COOKIE_PREFIX = "aqs";
const COOKIE_COUNT = `${COOKIE_PREFIX}n`;
const CHUNK = 3500;
const MAX_CHUNKS = 8;

const cookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 400,
};

type Store = {
  materias: Materia[];
  materiales: Material[];
  examenes: ExamenEnPreparacion[];
  temas: Tema[];
};

function emptyStore(): Store {
  return { materias: [], materiales: [], examenes: [], temas: [] };
}

async function loadStore(): Promise<Store> {
  const jar = await cookies();
  const count = Number(jar.get(COOKIE_COUNT)?.value || 0);
  if (!count) {
    const legacy = jar.get("arquimes-store")?.value;
    if (legacy) {
      try {
        return JSON.parse(legacy) as Store;
      } catch {
        return emptyStore();
      }
    }
    return emptyStore();
  }

  let raw = "";
  for (let i = 0; i < count && i < MAX_CHUNKS; i++) {
    raw += jar.get(`${COOKIE_PREFIX}${i}`)?.value || "";
  }

  if (!raw) return emptyStore();

  try {
    const parsed = JSON.parse(raw) as Store;
    return {
      materias: parsed.materias || [],
      materiales: parsed.materiales || [],
      examenes: parsed.examenes || [],
      temas: parsed.temas || [],
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: Store): Promise<void> {
  const jar = await cookies();
  const payload = JSON.stringify(store);

  jar.set(COOKIE_COUNT, "0", cookieOptions);
  for (let i = 0; i < MAX_CHUNKS; i++) {
    jar.delete(`${COOKIE_PREFIX}${i}`, { path: "/" });
  }

  const chunks: string[] = [];
  for (let i = 0; i < payload.length; i += CHUNK) {
    chunks.push(payload.slice(i, i + CHUNK));
  }

  if (chunks.length > MAX_CHUNKS) {
    throw new Error("El espacio de estudio es demasiado grande para esta demo");
  }

  jar.set(COOKIE_COUNT, String(chunks.length), cookieOptions);
  chunks.forEach((chunk, i) => {
    jar.set(`${COOKIE_PREFIX}${i}`, chunk, cookieOptions);
  });
}

async function mutate<T>(fn: (store: Store) => T): Promise<T> {
  const store = await loadStore();
  const result = fn(store);
  await saveStore(store);
  return result;
}

export async function getMaterias(): Promise<Materia[]> {
  const store = await loadStore();
  return [...store.materias].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getMateria(id: string): Promise<Materia | undefined> {
  const store = await loadStore();
  return store.materias.find((m) => m.id === id);
}

export async function createMateria(
  id: string,
  name: string,
  faculty?: string,
  catedra?: string
): Promise<Materia> {
  return mutate((store) => {
    const createdAt = new Date().toISOString();
    const materia: Materia = { id, name, faculty, catedra, createdAt };
    store.materias.push(materia);
    return materia;
  });
}

export async function deleteMateria(id: string): Promise<void> {
  await mutate((store) => {
    store.materias = store.materias.filter((m) => m.id !== id);
    store.materiales = store.materiales.filter((m) => m.materiaId !== id);
    const examenIds = new Set(
      store.examenes.filter((e) => e.materiaId === id).map((e) => e.id)
    );
    store.examenes = store.examenes.filter((e) => e.materiaId !== id);
    store.temas = store.temas.filter((t) => !examenIds.has(t.examenId));
  });
}

export async function getMateriales(materiaId: string): Promise<Material[]> {
  const store = await loadStore();
  return store.materiales
    .filter((m) => m.materiaId === materiaId)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
}

export async function getMaterial(id: string): Promise<Material | undefined> {
  const store = await loadStore();
  return store.materiales.find((m) => m.id === id);
}

export async function createMaterial(
  id: string,
  materiaId: string,
  name: string,
  type: string,
  size: number,
  storageKey: string
): Promise<Material> {
  return mutate((store) => {
    const addedAt = new Date().toISOString();
    const material: Material = {
      id,
      materiaId,
      name,
      type,
      size,
      storageKey,
      addedAt,
    };
    store.materiales.push(material);
    return material;
  });
}

export async function deleteMaterial(id: string): Promise<void> {
  await mutate((store) => {
    store.materiales = store.materiales.filter((m) => m.id !== id);
  });
}

export async function getExamenes(materiaId: string): Promise<ExamenEnPreparacion[]> {
  const store = await loadStore();
  return store.examenes
    .filter((e) => e.materiaId === materiaId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getExamen(id: string): Promise<ExamenEnPreparacion | undefined> {
  const store = await loadStore();
  return store.examenes.find((e) => e.id === id);
}

export async function createExamen(
  id: string,
  materiaId: string,
  type: ExamType,
  date: string,
  modality?: string
): Promise<ExamenEnPreparacion> {
  return mutate((store) => {
    const createdAt = new Date().toISOString();
    const examen: ExamenEnPreparacion = {
      id,
      materiaId,
      type,
      date,
      modality,
      createdAt,
    };
    store.examenes.push(examen);
    return examen;
  });
}

export async function deleteExamen(id: string): Promise<void> {
  await mutate((store) => {
    store.examenes = store.examenes.filter((e) => e.id !== id);
    store.temas = store.temas.filter((t) => t.examenId !== id);
  });
}

export async function getTemas(examenId: string): Promise<Tema[]> {
  const store = await loadStore();
  return store.temas
    .filter((t) => t.examenId === examenId)
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export async function createTema(
  id: string,
  examenId: string,
  name: string
): Promise<Tema> {
  return mutate((store) => {
    const createdAt = new Date().toISOString();
    const masteryState: MasteryState = "no_estudiado";
    const tema: Tema = { id, examenId, name, masteryState, createdAt };
    store.temas.push(tema);
    return tema;
  });
}

export async function createExamenWithTemas(
  id: string,
  materiaId: string,
  type: ExamType,
  date: string,
  modality: string | undefined,
  temaNames: string[]
): Promise<ExamenEnPreparacion> {
  return mutate((store) => {
    const createdAt = new Date().toISOString();
    const examen: ExamenEnPreparacion = {
      id,
      materiaId,
      type,
      date,
      modality,
      createdAt,
    };
    store.examenes.push(examen);
    for (const name of temaNames) {
      store.temas.push({
        id: uuid(),
        examenId: id,
        name,
        masteryState: "no_estudiado",
        createdAt: new Date().toISOString(),
      });
    }
    return examen;
  });
}

export async function updateTemaMastery(
  id: string,
  masteryState: MasteryState
): Promise<void> {
  await mutate((store) => {
    const tema = store.temas.find((t) => t.id === id);
    if (tema) {
      tema.masteryState = masteryState;
    }
  });
}

export async function deleteTema(id: string): Promise<void> {
  await mutate((store) => {
    store.temas = store.temas.filter((t) => t.id !== id);
  });
}
