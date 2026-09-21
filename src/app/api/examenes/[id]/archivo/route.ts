import { NextResponse } from "next/server";
import { getExamen, getMaterial } from "@/lib/db";
import { readStudyFileContent } from "@/lib/file-store";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    const examen = await getExamen(id);
    if (!examen) {
      return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
    }

    const material = examen.materialId
      ? await getMaterial(examen.materialId)
      : undefined;
    if (!material) {
      return NextResponse.json(
        { error: "Este examen no tiene archivo." },
        { status: 404 }
      );
    }

    const persisted = await readStudyFileContent(material.storageKey);
    const bytes = material.contentBase64
      ? Buffer.from(material.contentBase64, "base64")
      : persisted?.bytes;
    if (!bytes) {
      return NextResponse.json(
        { error: "Este examen no tiene archivo." },
        { status: 404 }
      );
    }
    const fileName = examen.fileName || material.name || "examen";
    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const disposition = download ? "attachment" : "inline";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          persisted?.type || material.type || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "No pude leer el archivo del examen.");
  }
}
