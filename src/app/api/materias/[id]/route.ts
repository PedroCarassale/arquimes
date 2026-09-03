import { NextResponse } from "next/server";
import { getMateria, deleteMateria } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const materia = await getMateria(id);

  if (!materia) {
    return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
  }

  return NextResponse.json(materia);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteMateria(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar la materia" },
      { status: 500 }
    );
  }
}
