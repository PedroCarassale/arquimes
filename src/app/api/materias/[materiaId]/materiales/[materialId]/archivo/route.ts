import { NextResponse } from "next/server";
import { getMaterial } from "@/lib/db";
import { readStudyFileContent } from "@/lib/file-store";

export const dynamic = "force-dynamic";

type Params = { materiaId: string; materialId: string };

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { materiaId, materialId } = await params;
  const material = await getMaterial(materialId);
  if (!material || material.materiaId !== materiaId) {
    return NextResponse.json(
      { error: "Archivo no encontrado en esta materia." },
      { status: 404 }
    );
  }

  const persisted = await readStudyFileContent(material.storageKey);
  const bytes = material.contentBase64
    ? Buffer.from(material.contentBase64, "base64")
    : persisted?.bytes;
  if (!bytes) {
    return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
  }

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const fileName = material.name || "archivo";
  const contentType =
    persisted?.type || material.type || "application/octet-stream";
  const contentDisposition = download ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${contentDisposition}; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
