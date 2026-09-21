import { NextResponse } from "next/server";
import { getMateria, deleteMateria } from "@/lib/db";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    const materia = await getMateria(id);

    if (!materia) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }

    return NextResponse.json(materia);
  } catch (error) {
    return apiErrorResponse(error, "No pude leer la materia.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    await deleteMateria(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Error al eliminar la materia");
  }
}
