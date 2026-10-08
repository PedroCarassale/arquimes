import { NextResponse } from "next/server";
import { getMateria } from "@/lib/db";
import { listArtefactos, saveArtefacto } from "@/lib/workspace-store";
import { apunteDesdeChat } from "@/lib/artefactos";
import { MAX_ARTEFACTO_CHARS } from "@/lib/limits";
import type { ArtefactoCreado } from "@/lib/types";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const artefactos = await listArtefactos((await params).id);
    return NextResponse.json(
      artefactos.map(({ id, titulo, tipo, version, createdAt, updatedAt }) => ({
        id,
        titulo,
        tipo,
        version,
        createdAt,
        updatedAt,
      }))
    );
  } catch (error) {
    return apiErrorResponse(error, "No pude leer los generados.");
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    await requireServerSession();
    const { id } = await params;
    if (!(await getMateria(id))) {
      return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      contenido?: unknown;
      titulo?: unknown;
    };
    const raw = typeof body.contenido === "string" ? body.contenido : "";
    const apunte = apunteDesdeChat(
      raw,
      typeof body.titulo === "string" ? body.titulo : undefined
    );
    if (!apunte.contenido) {
      return NextResponse.json({ error: "No hay nada para guardar." }, { status: 400 });
    }
    if (apunte.contenido.length > MAX_ARTEFACTO_CHARS) {
      return NextResponse.json(
        { error: "Es demasiado largo para guardarlo." },
        { status: 413 }
      );
    }
    const artefacto = await saveArtefacto({
      materiaId: id,
      tipo: "documento",
      titulo: apunte.titulo,
      contenido: apunte.contenido,
    });
    const creado: ArtefactoCreado = {
      id: artefacto.id,
      titulo: artefacto.titulo,
      tipo: artefacto.tipo,
      version: artefacto.version,
    };
    return NextResponse.json(creado, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "No pude guardarlo en Apuntes.");
  }
}
