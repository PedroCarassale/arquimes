import { redirect } from "next/navigation";
import { getMaterias } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function ArchivosPage() {
  const materias = getMaterias();
  
  if (materias.length > 0) {
    redirect(`/materias/${materias[0].id}/apuntes`);
  }
  
  redirect("/");
}
