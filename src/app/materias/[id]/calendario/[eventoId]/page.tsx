import { notFound } from "next/navigation";
import { EventoDetalle } from "@/components/calendar/EventoDetalle";
import { getExamen, getTemas } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EventoPage({
  params,
}: {
  params: Promise<{ id: string; eventoId: string }>;
}) {
  const { id, eventoId } = await params;
  const [evento, temas] = await Promise.all([getExamen(eventoId), getTemas(eventoId)]);
  if (!evento || evento.materiaId !== id) notFound();
  return <EventoDetalle key={evento.id} evento={{ ...evento, fileContentBase64: undefined }} temas={temas} />;
}
