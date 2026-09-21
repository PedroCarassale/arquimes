import { NextResponse } from "next/server";
import {
  deleteChatSession,
  renameChatSession,
  StorageConfigError,
} from "@/lib/chat-store";
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
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "El chat necesita un título." },
        { status: 400 }
      );
    }
    const updated = await renameChatSession(id, title);
    if (!updated) {
      return NextResponse.json(
        { error: "No encontré esa sesión para renombrarla." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StorageConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return apiErrorResponse(error, "No pude renombrar el chat.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    const deleted = await deleteChatSession(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "No encontré esa sesión para eliminarla." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof StorageConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return apiErrorResponse(error, "No pude eliminar el chat.");
  }
}
