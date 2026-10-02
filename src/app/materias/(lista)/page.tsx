import { MateriasHubPage } from "@/components/MateriasHubPage";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface MateriasPageProps {
  searchParams: Promise<{ destino?: string | string[] }>;
}

export default async function MateriasPage({ searchParams }: MateriasPageProps) {
  const params = await searchParams;
  const rawDestino = params.destino;
  const destino = Array.isArray(rawDestino) ? rawDestino[0] : rawDestino;
  if (destino === "chat") {
    redirect("/materias/chats");
  }

  return <MateriasHubPage mode="inicio" />;
}
