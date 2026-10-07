import { NextResponse } from "next/server";
import { deleteNota, getNota, updateNota } from "@/lib/workspace-store";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const nota = await getNota((await params).id);
    if (!nota) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
    return NextResponse.json(nota);
  } catch (error) {
    return apiErrorResponse(error, "No pude leer la nota.");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const body = (await request.json().catch(() => ({}))) as {
      titulo?: unknown;
      contenido?: unknown;
    };
    const nota = await updateNota((await params).id, {
      titulo: typeof body.titulo === "string" ? body.titulo : undefined,
      contenido: typeof body.contenido === "string" ? body.contenido : undefined,
    });
    if (!nota) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
    return NextResponse.json(nota);
  } catch (error) {
    return apiErrorResponse(error, "No pude guardar la nota.");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireServerSession();
    await deleteNota((await params).id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "No pude borrar la nota.");
  }
}
