import { NextResponse } from "next/server";
import {
  deleteExamen,
  getExamen,
  getMaterial,
  materialHasContent,
  updateExamenNote,
} from "@/lib/db";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    const examen = await getExamen(id);
    if (!examen) {
      return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
    }
    const material = examen.materialId
      ? await getMaterial(examen.materialId)
      : undefined;
    return NextResponse.json({
      ...examen,
      hasFile: material ? materialHasContent(material) : false,
    });
  } catch (error) {
    return apiErrorResponse(error, "No pude leer el examen.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    const examen = await getExamen(id);
    if (!examen) {
      return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const name =
      typeof body.note === "string"
        ? body.note.trim()
        : typeof body.name === "string"
          ? body.name.trim()
          : "";
    const updated = await updateExamenNote(id, name || undefined);
    return NextResponse.json(updated);
  } catch (error) {
    return apiErrorResponse(error, "No pude actualizar el examen.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    const examen = await getExamen(id);
    if (!examen) {
      return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
    }
    await deleteExamen(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "No pude eliminar el examen.");
  }
}
