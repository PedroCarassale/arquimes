import { MateriasHubPage } from "@/components/MateriasHubPage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <MateriasHubPage mode="inicio" />;
}
