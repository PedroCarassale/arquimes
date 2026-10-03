import { NextResponse } from "next/server";
import { putStudyFileChunk } from "@/lib/file-store";
import { UPLOAD_CHUNK_BYTES } from "@/lib/limits";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ fileId: string; index: string }> }
) {
  try {
    await requireServerSession();
    const { fileId, index } = await params;
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length === 0 || bytes.length > UPLOAD_CHUNK_BYTES) {
      return NextResponse.json({ error: "Bloque inválido." }, { status: 400 });
    }
    await putStudyFileChunk(fileId, Number(index), bytes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "No pude guardar el bloque.");
  }
}
