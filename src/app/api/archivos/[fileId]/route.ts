import { NextResponse } from "next/server";
import {
  deleteStudyFileByStorageKey,
  getStudyFileLectura,
  getStudyFileRecord,
  storageKeyForFile,
} from "@/lib/file-store";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const { fileId } = await params;
    if (!(await getStudyFileRecord(fileId))) {
      return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ lectura: await getStudyFileLectura(fileId) });
  } catch (error) {
    return apiErrorResponse(error, "No pude leer el estado del archivo.");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const { fileId } = await params;
    const record = await getStudyFileRecord(fileId);
    if (record?.uploadStatus === "uploading") {
      await deleteStudyFileByStorageKey(storageKeyForFile(fileId));
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "No pude cancelar la subida.");
  }
}
