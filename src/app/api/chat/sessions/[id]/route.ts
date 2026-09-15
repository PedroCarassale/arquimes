import { NextResponse } from "next/server";
import {
  deleteChatSession,
  renameChatSession,
  StorageConfigError,
} from "@/lib/chat-store";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const message =
      error instanceof Error ? error.message : "No pude renombrar el chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const message =
      error instanceof Error ? error.message : "No pude eliminar el chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
