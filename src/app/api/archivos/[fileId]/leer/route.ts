import { NextResponse } from "next/server";
import { readNextPart } from "@/lib/study-ingest";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    await requireServerSession();
    const { fileId } = await params;
    const result = await readNextPart(fileId);
    if (!result) {
      return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "No pude leer el archivo.");
  }
}
