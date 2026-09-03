import { NextResponse } from "next/server";
import { getTemaNamesForMateria, getMateria } from "@/lib/db";

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
  const names = await getTemaNamesForMateria(id);
  return NextResponse.json(names);
}
