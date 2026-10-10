import { NextResponse } from "next/server";
import { createPendingStudyFile } from "@/lib/file-store";
import { editorImageError, editorImageName, isEditorImageId, MAX_EDITOR_IMAGE_BYTES } from "@/lib/editor-images";
import { UPLOAD_CHUNK_BYTES } from "@/lib/limits";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireServerSession();
    const body = (await request.json().catch(() => ({}))) as { id?: unknown; type?: unknown; size?: unknown };
    const type = typeof body.type === "string" ? body.type : "";
    const size = typeof body.size === "number" && Number.isFinite(body.size) ? body.size : 0;
    const invalid = editorImageError(type, size);
    if (invalid) return NextResponse.json({ error: invalid }, { status: size > MAX_EDITOR_IMAGE_BYTES ? 413 : 400 });
    const id = isEditorImageId(body.id) ? body.id.toLowerCase() : undefined;
    if (body.id !== undefined && !id) {
      return NextResponse.json({ error: "No pude subir la imagen." }, { status: 400 });
    }
    const chunkCount = Math.ceil(size / UPLOAD_CHUNK_BYTES);
    const fileId = await createPendingStudyFile({
      name: editorImageName(type),
      type,
      size,
      chunkCount,
      id,
    });
    return NextResponse.json({ fileId, chunkSize: UPLOAD_CHUNK_BYTES, chunkCount }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "No pude iniciar la subida de la imagen.");
  }
}
