import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { deleteMaterial } from "@/lib/db";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const db = await import("@/lib/db");
    const materiales = db.getMateriales("");

    const allMaterias = db.getMaterias();
    let material = null;
    for (const materia of allMaterias) {
      const mats = db.getMateriales(materia.id);
      const found = mats.find((m) => m.id === id);
      if (found) {
        material = found;
        break;
      }
    }

    if (material) {
      try {
        await unlink(path.join(UPLOADS_DIR, material.storageKey));
      } catch {
        // File may not exist
      }
    }

    deleteMaterial(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar el material" },
      { status: 500 }
    );
  }
}
