import { AuthScreen } from "@/components/AuthScreen";
import { isGoogleAuthEnabled } from "@/lib/auth";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/";
  return (
    <AuthScreen
      mode="login"
      googleEnabled={isGoogleAuthEnabled}
      nextPath={nextPath}
    />
  );
}
