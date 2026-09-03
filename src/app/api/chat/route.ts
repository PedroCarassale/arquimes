import { NextResponse } from "next/server";
import { addChatTurn, getMessages } from "@/lib/db";

export const dynamic = "force-dynamic";

function stubReply(): string {
  return "Todavía no leí tus apuntes. Cuando el chat esté conectado a tu material, voy a poder ayudarte con esta materia.";
}

export async function GET() {
  const messages = await getMessages();
  return NextResponse.json(messages);
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
      typeof body.materiaId === "string" ? body.materiaId : undefined;
    const turn = await addChatTurn(content, stubReply(), materiaId);
    return NextResponse.json(turn, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al enviar el mensaje";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
