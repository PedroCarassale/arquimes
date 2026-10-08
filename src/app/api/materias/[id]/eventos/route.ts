import { NextResponse } from "next/server";
import { getMateria, listEventos } from "@/lib/db";
import { parseRangoEventos } from "@/lib/evaluacion-input";
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
    if (!(await getMateria(id))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }
    const rango = parseRangoEventos(new URL(request.url).searchParams);
    if ("error" in rango) {
      return NextResponse.json({ error: rango.error }, { status: 400 });
    }
    return NextResponse.json(await listEventos({ ...rango, materiaId: id }));
  } catch (error) {
    return apiErrorResponse(error, "No pude leer el calendario de la materia.");
  }
}
