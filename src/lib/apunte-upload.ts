import { apiFetch } from "@/lib/api";
import { MAX_STUDY_FILE_BYTES, studyFileTooBigMessage } from "@/lib/limits";

const SUPPORTED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "md",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "mp4",
  "mov",
  "webm",
]);

export function validateApunteFile(file: File): string | null {
  if (!file) return "No se recibió ningún archivo.";
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > MAX_STUDY_FILE_BYTES) return studyFileTooBigMessage(file.name);

  const extension = file.name.toLowerCase().split(".").pop() || "";
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return `No pude guardar “${file.name}”: formato no compatible.`;
  }
  return null;
}

export async function uploadApunteFile(materiaId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch(`/api/materias/${materiaId}/materiales`, {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `No pude guardar “${file.name}”.`);
  }
}
