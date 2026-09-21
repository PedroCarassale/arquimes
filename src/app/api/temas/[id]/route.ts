import { NextResponse } from "next/server";
import { updateTemaMastery, deleteTema } from "@/lib/db";
import { MasteryState, MASTERY_ORDER } from "@/lib/types";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    const body = await request.json();
    const { masteryState } = body;

    if (!masteryState || !MASTERY_ORDER.includes(masteryState as MasteryState)) {
      return NextResponse.json(
        { error: "Estado de dominio inválido" },
        { status: 400 }
      );
    }

    await updateTemaMastery(id, masteryState as MasteryState);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Error al actualizar el tema");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    await deleteTema(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Error al eliminar el tema");
  }
}
