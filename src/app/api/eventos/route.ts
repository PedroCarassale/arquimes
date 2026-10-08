import { NextResponse } from "next/server";
import { listEventos } from "@/lib/db";
import { parseRangoEventos } from "@/lib/evaluacion-input";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireServerSession();
    const rango = parseRangoEventos(new URL(request.url).searchParams);
    if ("error" in rango) {
      return NextResponse.json({ error: rango.error }, { status: 400 });
    }
    return NextResponse.json(await listEventos(rango));
  } catch (error) {
    return apiErrorResponse(error, "No pude leer el calendario.");
  }
}
