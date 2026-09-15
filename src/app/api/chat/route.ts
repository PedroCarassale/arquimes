import { NextResponse } from "next/server";
import {
  getStudyGrounding,
  getStudyContext,
} from "@/lib/db";
import {
  addTurn,
  createChatSession,
  getChatSession,
  listChatSessionsForMateria,
  listMessages,
  StorageConfigError,
} from "@/lib/chat-store";
import { providerStatus, ProviderConfigError } from "@/lib/ai-providers";
import { getSuggestedChips, runGroundedChat } from "@/lib/chat-service";
import { composeStudyReply } from "@/lib/study-chat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const materiaId = url.searchParams.get("materiaId")?.trim();
  if (!materiaId) {
    return NextResponse.json(
      { error: "Falta la materia para abrir el chat." },
      { status: 400 }
    );
  }
  const examenId = url.searchParams.get("examenId")?.trim() || undefined;
  const requestedSessionId = url.searchParams.get("sessionId")?.trim() || undefined;

  try {
    const ctx = await getStudyContext(materiaId);
    if (!ctx) {
      return NextResponse.json(
        { error: "No encuentro esa materia en tu sesión." },
        { status: 404 }
      );
    }
    const sessions = await listChatSessionsForMateria(materiaId, examenId);
    const selectedSession =
      (requestedSessionId &&
        sessions.find((session) => session.id === requestedSessionId)) ||
      sessions[0] ||
      null;
    const messages = selectedSession ? await listMessages(selectedSession.id) : [];
    const grounding = await getStudyGrounding(materiaId);
    return NextResponse.json({
      sessions,
      activeSessionId: selectedSession?.id || null,
      messages,
      grounding,
      provider: providerStatus(),
      suggestedChips: getSuggestedChips(),
    });
  } catch (error) {
    if (error instanceof StorageConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "No pude abrir el chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
      typeof body.materiaId === "string" ? body.materiaId.trim() : "";
    if (!materiaId) {
      return NextResponse.json(
        { error: "Elegí una materia para continuar el chat." },
        { status: 400 }
      );
    }
    const examenId =
      typeof body.examenId === "string" && body.examenId.trim()
        ? body.examenId.trim()
        : undefined;
    const requestedSessionId =
      typeof body.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId.trim()
        : undefined;

    const ctx = await getStudyContext(materiaId);
    if (!ctx) {
      return NextResponse.json(
        { error: "No encuentro esa materia en tu sesión." },
        { status: 404 }
      );
    }

    let session = requestedSessionId
      ? await getChatSession(requestedSessionId)
      : null;
    if (!session || session.materiaId !== materiaId) {
      session = await createChatSession({
        materiaId,
        examenId,
        title: inferSessionTitle(content),
      });
    }

    const history = await listMessages(session.id);
    const hasReadableSources = ctx.sources.some((source) =>
      Boolean(source.text?.trim())
    );

    let assistantText = "";
    let citations: string[] = [];
    let isError = false;
    if (!hasReadableSources) {
      const reply = composeStudyReply(content, ctx);
      assistantText = reply.content;
      citations = reply.citations;
      isError = true;
    } else {
      try {
        const generated = await runGroundedChat({
          context: ctx,
          history,
          userMessage: content,
        });
        assistantText = generated.answer;
        citations = generated.citations;
      } catch (error) {
        if (error instanceof ProviderConfigError) {
          assistantText = error.message;
          isError = true;
        } else {
          throw error;
        }
      }
    }

    const turn = await addTurn({
      sessionId: session.id,
      userContent: content,
      assistantContent: assistantText,
      citations,
      assistantIsError: isError,
    });

    return NextResponse.json(
      {
        session,
        turn,
        isError,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof StorageConfigError || error instanceof ProviderConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "Error al enviar el mensaje";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function inferSessionTitle(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Nuevo chat";
  return cleaned.length <= 64 ? cleaned : `${cleaned.slice(0, 64).trim()}…`;
}
