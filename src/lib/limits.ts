export const MAX_STUDY_FILE_BYTES = 15 * 1024 * 1024; // 15MB por archivo

export function studyFileTooBigMessage(fileName: string): string {
  return `No pude guardar “${fileName}”: supera el límite de 15 MB por archivo.`;
}
