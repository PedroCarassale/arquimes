import { cache } from "react";
import { getExamen, getMateria, getMaterial } from "@/lib/db";
import { getArtefacto, getNota } from "@/lib/workspace-store";

export const getMateriaCached = cache(getMateria);
export const getNotaCached = cache(getNota);
export const getMaterialCached = cache(getMaterial);
export const getExamenCached = cache(getExamen);
export const getArtefactoCached = cache(getArtefacto);
