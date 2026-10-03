import { validateStudyFile } from "@/lib/study-upload";
import { enqueueUploads } from "@/lib/upload-queue";
import type { Material } from "@/lib/types";

export const validateApunteFile = validateStudyFile;

type UploadedMaterial = Pick<Material, "id" | "name" | "type" | "size" | "lectura">;

export async function uploadApunteFile(
  materiaId: string,
  file: File
): Promise<UploadedMaterial> {
  const [upload] = enqueueUploads(materiaId, [file], { kind: "apuntes" });
  const result = await upload;
  if (!result.material) throw new Error(`No pude guardar “${file.name}”.`);
  return result.material;
}
