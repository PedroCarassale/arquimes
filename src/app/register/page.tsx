import type { Metadata } from "next";
import { AuthScreen } from "@/components/AuthScreen";
import { isGoogleAuthEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <AuthScreen
      mode="register"
      googleEnabled={isGoogleAuthEnabled}
      nextPath="/"
    />
  );
}
