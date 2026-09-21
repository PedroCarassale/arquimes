import { AuthScreen } from "@/components/AuthScreen";
import { isGoogleAuthEnabled } from "@/lib/auth";

export default function RegisterPage() {
  return (
    <AuthScreen
      mode="register"
      googleEnabled={isGoogleAuthEnabled}
      nextPath="/"
    />
  );
}
