import { redirect } from "next/navigation";
import { getMaterias } from "@/lib/db";
import { rutas } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function ArchivosPage() {
  const materias = await getMaterias();

  if (materias.length > 0) {
    redirect(rutas.apuntes(materias[0].id));
  }

  redirect(rutas.inicio);
}
