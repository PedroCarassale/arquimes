import { NextResponse } from "next/server";
import { registrarEdicionEnMensaje, StorageConfigError } from "@/lib/chat-store";
import { parseRegistro } from "@/lib/edicion-clase";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const MAX_REEMPLAZADO_CHARS = 200_000;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const index = Number(body?.index);
    const registro = parseRegistro(body?.registro, MAX_REEMPLAZADO_CHARS);
    if (!Number.isInteger(index) || index < 0 || !registro) {
      return NextResponse.json(
        { error: "No entendí qué cambio de la clase querés registrar." },
        { status: 400 }
      );
    }
    const updated = await registrarEdicionEnMensaje(id, index, registro);
    if (!updated) {
      return NextResponse.json(
        { error: "No encontré ese cambio en el chat." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StorageConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return apiErrorResponse(error, "No pude guardar el cambio en el chat.");
  }
}
