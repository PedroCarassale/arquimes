import { MateriasHubPage } from "@/components/MateriasHubPage";

export const dynamic = "force-dynamic";

export default async function MateriasChatsPage() {
  return <MateriasHubPage mode="selector-chat" />;
}
