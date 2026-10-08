import { NextResponse } from "next/server";
import { deleteTema } from "@/lib/db";
import { requireServerSession } from "@/lib/auth-session";
import { apiErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerSession();
    const { id } = await params;
    await deleteTema(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Error al eliminar el tema");
  }
}
