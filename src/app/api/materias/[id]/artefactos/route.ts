import { NextResponse } from "next/server";
import { listArtefactos } from "@/lib/workspace-store";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const artefactos = await listArtefactos((await params).id);
    return NextResponse.json(
      artefactos.map(({ id, titulo, tipo, version, createdAt, updatedAt }) => ({
        id,
        titulo,
        tipo,
        version,
        createdAt,
        updatedAt,
      }))
    );
  } catch (error) {
    return apiErrorResponse(error, "No pude leer los generados.");
  }
}
