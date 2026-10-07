import { NextResponse } from "next/server";
import { getMateria } from "@/lib/db";
import { createNota, listNotas } from "@/lib/workspace-store";
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
    return NextResponse.json(await listNotas(id));
  } catch (error) {
    return apiErrorResponse(error, "No pude leer las notas.");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    if (!(await getMateria(id))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      titulo?: unknown;
      contenido?: unknown;
    };
    const nota = await createNota(id, {
      titulo: typeof body.titulo === "string" ? body.titulo : "",
      contenido: typeof body.contenido === "string" ? body.contenido : "",
    });
    return NextResponse.json(nota, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "No pude crear la nota.");
  }
}
