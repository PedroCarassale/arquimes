import { NextResponse } from "next/server";
import { deleteMaterial, getMaterial } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const material = await getMaterial(id);
  if (!material || !material.contentBase64) {
    return NextResponse.json(
      { error: "Archivo no encontrado" },
      { status: 404 }
    );
  }

  const bytes = Buffer.from(material.contentBase64, "base64");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": material.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(material.name)}"`,
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
