import { NextResponse } from "next/server";
import { getMaterial } from "@/lib/db";
import { studyFileResponse } from "@/lib/file-store";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

type Params = { id: string; materialId: string };

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    await requireServerSession();
    const { id, materialId } = await params;
    const material = await getMaterial(materialId);
    if (!material || material.materiaId !== id) {
      return NextResponse.json(
        { error: "Archivo no encontrado en esta materia." },
        { status: 404 }
      );
    }

    const fileName = material.name || "archivo";
    if (!material.contentBase64) {
      const streamed = await studyFileResponse(material.storageKey, request, {
        fileName,
        fallbackType: material.type,
      });
      if (streamed) return streamed;
    }
    const bytes = material.contentBase64
      ? Buffer.from(material.contentBase64, "base64")
      : undefined;
    if (!bytes) {
      return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    }

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const contentType = material.type || "application/octet-stream";
    const contentDisposition = download ? "attachment" : "inline";

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${contentDisposition}; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "No pude leer el archivo.");
  }
}
