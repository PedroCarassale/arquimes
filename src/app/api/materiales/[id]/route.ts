import { NextResponse } from "next/server";
import { deleteMaterial, getMaterial } from "@/lib/db";
import { readStudyFileContent } from "@/lib/file-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const material = await getMaterial(id);
  if (!material) {
    return NextResponse.json(
      { error: "Archivo no encontrado" },
      { status: 404 }
    );
  }

  const persisted = await readStudyFileContent(material.storageKey);
  const bytes = material.contentBase64
    ? Buffer.from(material.contentBase64, "base64")
    : persisted?.bytes;
  if (!bytes) {
    return NextResponse.json(
      { error: "Archivo no encontrado" },
      { status: 404 }
    );
  }
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type":
        persisted?.type || material.type || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(material.name)}"`,
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteMaterial(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar el material" },
      { status: 500 }
    );
  }
}
