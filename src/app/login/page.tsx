import type { Metadata } from "next";
import { AuthScreen } from "@/components/AuthScreen";
import { isGoogleAuthEnabled } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/redirect-path";

export const metadata: Metadata = { title: "Iniciar sesión" };

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeRedirectPath(params.next);
  return (
    <AuthScreen
      mode="login"
      googleEnabled={isGoogleAuthEnabled}
      nextPath={nextPath}
      oauthError={typeof params.error === "string" ? params.error : undefined}
    />
  );
}
