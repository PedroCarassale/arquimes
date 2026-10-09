import { NextResponse } from "next/server";
import {
  deleteArtefacto,
  getArtefacto,
  listArtefactoVersiones,
} from "@/lib/workspace-store";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const { id } = await params;
    const artefacto = await getArtefacto(id);
    if (!artefacto) {
      return NextResponse.json({ error: "Pergamino no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ...artefacto, versiones: await listArtefactoVersiones(id) });
  } catch (error) {
    return apiErrorResponse(error, "No pude leer el pergamino.");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireServerSession();
    await deleteArtefacto((await params).id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "No pude borrar el pergamino.");
  }
}
