import { NextResponse } from "next/server";
import { deleteMaterial, getMaterial } from "@/lib/db";
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
  } catch (error) {
    return apiErrorResponse(error, "No pude leer el material.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    await deleteMaterial(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Error al eliminar el material");
  }
}
