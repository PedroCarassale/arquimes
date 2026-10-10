import { NextResponse } from "next/server";
import {
  deleteStudyFileByStorageKey,
  getStudyFileRecord,
  markStudyFileUploaded,
  missingStudyFileChunks,
  storageKeyForFile,
  studyFileResponse,
} from "@/lib/file-store";
import { EDITOR_IMAGE_TYPES, editorImageUrl, isEditorImageId } from "@/lib/editor-images";
import { removeEditorImageReferences } from "@/lib/workspace-store";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fileId: string }> };

const UPLOAD_EN_CURSO_MS = 15 * 60 * 1000;

const notFound = () =>
  NextResponse.json({ error: "Imagen no encontrada." }, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const { fileId } = await params;
    const record = await getStudyFileRecord(fileId);
    if (!record || !EDITOR_IMAGE_TYPES[record.type]) return notFound();
    const response = await studyFileResponse(storageKeyForFile(fileId), request, {
      fileName: record.name,
      fallbackType: record.type,
      cacheControl: "private, max-age=31536000, immutable",
    });
    if (!response) return notFound();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    return response;
  } catch (error) {
    return apiErrorResponse(error, "No pude leer la imagen.");
  }
}

export async function POST(_request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const { fileId } = await params;
    const record = await getStudyFileRecord(fileId);
    if (!record || !EDITOR_IMAGE_TYPES[record.type]) return notFound();
    if (record.uploadStatus !== "uploading") {
      return NextResponse.json({ url: editorImageUrl(fileId) });
    }
    const { missing, totalBytes } = await missingStudyFileChunks(fileId, record.chunkCount);
    if (missing.length > 0 || totalBytes !== record.size) {
      return NextResponse.json({ error: "La imagen no terminó de subirse. Probá de nuevo." }, { status: 409 });
    }
    await markStudyFileUploaded(fileId, {
      extractedText: null,
      extractionStatus: "editor-image",
      pageCount: 0,
    });
    return NextResponse.json({ url: editorImageUrl(fileId) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "No pude terminar de subir la imagen.");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const { fileId } = await params;
    if (!isEditorImageId(fileId)) return notFound();
    const record = await getStudyFileRecord(fileId);
    if (record?.uploadStatus === "ready") {
      return NextResponse.json({ error: "La imagen ya se subió." }, { status: 409 });
    }
    const faltante = new URL(request.url).searchParams.has("faltante");
    if (faltante && record && Date.now() - (Date.parse(record.createdAt ?? "") || 0) < UPLOAD_EN_CURSO_MS) {
      return NextResponse.json({ error: "La imagen todavía se está subiendo." }, { status: 409 });
    }
    if (record) await deleteStudyFileByStorageKey(storageKeyForFile(fileId));
    await removeEditorImageReferences(fileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "No pude sacar la imagen.");
  }
}
