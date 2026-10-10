import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventoDetalle } from "@/components/calendar/EventoDetalle";
import { getTemas } from "@/lib/db";
import { evaluacionNombre } from "@/lib/evaluaciones";
import { getExamenCached } from "@/lib/page-data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; eventoId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, eventoId } = await params;
  const evento = await getExamenCached(eventoId);
  if (!evento || evento.materiaId !== id) return {};
  return { title: evaluacionNombre(evento).trim() || "Evento" };
}

export default async function EventoPage({ params }: Props) {
  const { id, eventoId } = await params;
  const [evento, temas] = await Promise.all([getExamenCached(eventoId), getTemas(eventoId)]);
  if (!evento || evento.materiaId !== id) notFound();
  return <EventoDetalle key={evento.id} evento={{ ...evento, fileContentBase64: undefined }} temas={temas} />;
}
