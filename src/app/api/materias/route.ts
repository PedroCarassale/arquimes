import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { createMateria, getMaterias } from "@/lib/db";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireServerSession();
    const materias = await getMaterias();
    return NextResponse.json(materias);
  } catch (error) {
    return apiErrorResponse(error, "Error interno");
  }
}

export async function POST(request: Request) {
  try {
    await requireServerSession();
    const body = await request.json();
    const { name, faculty, catedra } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const id = uuid();
    const materia = await createMateria(
      id,
      name.trim(),
      faculty?.trim() || undefined,
      catedra?.trim() || undefined
    );

    return NextResponse.json(materia, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Error al crear la materia");
  }
}
