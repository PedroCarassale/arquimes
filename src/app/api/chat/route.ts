import { NextResponse } from "next/server";
import {
  addChatTurn,
  getMessages,
  getStudyContext,
  getStudyGrounding,
} from "@/lib/db";
import { composeStudyReply } from "@/lib/study-chat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const materiaId = url.searchParams.get("materiaId") || undefined;
  const messages = await getMessages(materiaId);
  const grounding = materiaId ? await getStudyGrounding(materiaId) : null;
  return NextResponse.json({ messages, grounding });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const content =
      typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json(
        { error: "Escribí un mensaje" },
        { status: 400 }
      );
    }

    const materiaId =
      typeof body.materiaId === "string" && body.materiaId.trim()
        ? body.materiaId.trim()
        : undefined;

    const ctx = materiaId ? await getStudyContext(materiaId) : null;
    if (materiaId && !ctx) {
      return NextResponse.json(
        { error: "No encuentro esa materia en tu sesión." },
        { status: 404 }
      );
    }

    const reply = composeStudyReply(content, ctx);
    const turn = await addChatTurn(
      content,
      reply.content,
      materiaId,
      reply.citations
    );
    return NextResponse.json(turn, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al enviar el mensaje";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
