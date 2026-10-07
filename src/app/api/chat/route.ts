import { NextResponse } from "next/server";
import {
  getExamen,
  getStudyGrounding,
  getStudyContext,
  getTemas,
} from "@/lib/db";
import { getArtefacto, getNota, saveArtefacto } from "@/lib/workspace-store";
import type { StudyContext } from "@/lib/study-chat";
import type { ChatFocus } from "@/lib/chat-service";
import { examDisplayName } from "@/lib/format";
import type { Artefacto } from "@/lib/types";
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
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireServerSession();
    const url = new URL(request.url);
    const materiaId = url.searchParams.get("materiaId")?.trim();
    if (!materiaId) {
      return NextResponse.json(
        { error: "Falta la materia para abrir el chat." },
        { status: 400 }
      );
    }
    const examenId = url.searchParams.get("examenId")?.trim() || undefined;
    const requestedSessionId =
      url.searchParams.get("sessionId")?.trim() || undefined;
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
    return apiErrorResponse(error, "No pude abrir el chat.");
  }
}

export async function POST(request: Request) {
  try {
    await requireServerSession();
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
    const focus = await resolveFocus(body.focus, ctx);
    const hasReadableSources =
      ctx.sources.some((source) => Boolean(source.text?.trim())) ||
      ctx.exams.some((exam) => exam.temas.length > 0 || Boolean(exam.objective)) ||
      Boolean(focus?.contenido?.trim());
    const savedArtefactos: Artefacto[] = [];

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
          focus,
        });
        for (const block of generated.artefactos) {
          savedArtefactos.push(
            await saveArtefacto({
              materiaId,
              sessionId: session.id,
              id: block.id,
              tipo: block.tipo,
              titulo: block.titulo,
              contenido: block.contenido,
            })
          );
        }
        assistantText = savedArtefactos.length
          ? generated.withArtefactoIds(savedArtefactos.map((a) => a.id))
          : generated.answer;
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
        artefactos: savedArtefactos.map(({ id, titulo, tipo, version }) => ({
          id,
          titulo,
          tipo,
          version,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof StorageConfigError || error instanceof ProviderConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return apiErrorResponse(error, "Error al enviar el mensaje");
  }
}

async function resolveFocus(
  raw: unknown,
  ctx: StudyContext
): Promise<ChatFocus | null> {
  if (!raw || typeof raw !== "object") return null;
  const { kind, id } = raw as { kind?: unknown; id?: unknown };
  if (typeof id !== "string" || !id) return null;
  if (kind === "nota") {
    const nota = await getNota(id);
    return nota && nota.materiaId === ctx.materiaId
      ? { kind, id, titulo: nota.titulo, contenido: nota.contenido }
      : null;
  }
  if (kind === "artefacto") {
    const artefacto = await getArtefacto(id);
    return artefacto && artefacto.materiaId === ctx.materiaId
      ? { kind, id, titulo: artefacto.titulo, contenido: artefacto.contenido }
      : null;
  }
  if (kind === "material") {
    const source = ctx.sources.find((s) => s.materialId === id);
    return source ? { kind, id, titulo: source.name, contenido: source.text } : null;
  }
  if (kind === "examen") {
    const examen = await getExamen(id);
    if (!examen || examen.materiaId !== ctx.materiaId) return null;
    const temas = await getTemas(id);
    const contenido = [
      examen.kind === "entrega" ? "Entrega de trabajo práctico" : "Examen",
      examen.date ? `Fecha: ${examen.date}` : "",
      examen.description ? `Descripción: ${examen.description}` : "",
      temas.length ? `Temas: ${temas.map((t) => t.name).join(", ")}` : "Temas: sin cargar",
    ]
      .filter(Boolean)
      .join("\n");
    return { kind, id, titulo: examDisplayName(examen), contenido };
  }
  return null;
}

function inferSessionTitle(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Nuevo chat";
  return cleaned.length <= 64 ? cleaned : `${cleaned.slice(0, 64).trim()}…`;
}
