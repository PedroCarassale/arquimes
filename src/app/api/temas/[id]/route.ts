import { NextResponse } from "next/server";
import { updateTemaMastery, deleteTema } from "@/lib/db";
import { MasteryState, MASTERY_ORDER } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { masteryState } = body;

    if (!masteryState || !MASTERY_ORDER.includes(masteryState as MasteryState)) {
      return NextResponse.json(
        { error: "Estado de dominio inválido" },
        { status: 400 }
      );
    }

    updateTemaMastery(id, masteryState as MasteryState);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar el tema" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deleteTema(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar el tema" },
      { status: 500 }
    );
  }
}
