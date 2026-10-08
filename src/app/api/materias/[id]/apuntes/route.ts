import { NextResponse } from "next/server";
import { getMateria } from "@/lib/db";
import { listApuntes } from "@/lib/workspace-store";
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
    if (!(await getMateria(id))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }
    return NextResponse.json(await listApuntes(id));
  } catch (error) {
    return apiErrorResponse(error, "No pude leer los apuntes.");
  }
}
