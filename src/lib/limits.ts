export const MAX_SESSION_FILE_BYTES = 12_000;

export function sessionFileTooBigMessage(fileName: string): string {
  return `No pude guardar “${fileName}”: en esta versión el archivo tiene que ser menor a 12 KB para persistir en tu sesión.`;
}
