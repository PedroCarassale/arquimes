import { uploadStudyFile, validateStudyFile } from "@/lib/study-upload";
import type { Material } from "@/lib/types";

export const validateApunteFile = validateStudyFile;

type UploadedMaterial = Pick<Material, "id" | "name" | "type" | "size" | "lectura">;

export async function uploadApunteFile(
  materiaId: string,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<UploadedMaterial> {
  const result = await uploadStudyFile(materiaId, file, { kind: "apuntes", onProgress });
  if (!result.material) throw new Error(`No pude guardar “${file.name}”.`);
  return result.material;
}
