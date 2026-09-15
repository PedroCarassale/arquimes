import { NextResponse } from "next/server";
import { createChatSession, listChatSessionsForMateria, StorageConfigError } from "@/lib/chat-store";
import { getMateria } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const materiaId = url.searchParams.get("materiaId")?.trim();
  if (!materiaId) {
    return NextResponse.json(
      { error: "Falta materiaId para listar chats." },
      { status: 400 }
    );
  }
  const examenId = url.searchParams.get("examenId")?.trim() || undefined;

  try {
    const sessions = await listChatSessionsForMateria(materiaId, examenId);
    return NextResponse.json({ sessions });
  } catch (error) {
    if (error instanceof StorageConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No pude listar los chats.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const materiaId =
      typeof body.materiaId === "string" ? body.materiaId.trim() : "";
    if (!materiaId) {
      return NextResponse.json(
        { error: "Elegí una materia para crear un chat." },
        { status: 400 }
      );
    }
    const materia = await getMateria(materiaId);
    if (!materia) {
      return NextResponse.json(
        { error: "No encuentro esa materia." },
        { status: 404 }
      );
    }

    const titleRaw = typeof body.title === "string" ? body.title.trim() : "";
    const examenId =
      typeof body.examenId === "string" && body.examenId.trim()
        ? body.examenId.trim()
        : undefined;
    const title = titleRaw || "Nuevo chat";
    const session = await createChatSession({ materiaId, examenId, title });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    if (error instanceof StorageConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No pude crear el chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
