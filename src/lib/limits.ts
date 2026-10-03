export const MAX_STUDY_FILE_BYTES = 100 * 1024 * 1024;
export const UPLOAD_CHUNK_BYTES = 3 * 1024 * 1024;

export function studyFileTooBigMessage(fileName: string): string {
  return `No pude guardar “${fileName}”: supera el límite de 100 MB por archivo.`;
}

export const SUPPORTED_STUDY_EXTENSIONS = new Set([
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

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function fileExtension(name: string): string {
  return name.toLowerCase().split(".").pop() || "";
}

export function isSupportedStudyFile(name: string): boolean {
  return SUPPORTED_STUDY_EXTENSIONS.has(fileExtension(name));
}

export function studyFileMimeType(name: string, declared?: string): string {
  const type = declared?.trim();
  if (type && type !== "application/octet-stream") return type;
  return MIME_BY_EXTENSION[fileExtension(name)] || "application/octet-stream";
}
