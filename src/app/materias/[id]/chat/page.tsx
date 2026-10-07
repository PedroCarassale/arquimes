import { redirect } from "next/navigation";

export default async function MateriaChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/materias/${id}`);
}
