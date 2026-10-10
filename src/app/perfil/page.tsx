import type { Metadata } from "next";
import { headers } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { ProfileScreen } from "@/components/ProfileScreen";
import { auth } from "@/lib/auth";
import { requirePageSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Perfil" };

type UserAccount = {
  providerId?: string;
};

export default async function PerfilPage() {
  const session = await requirePageSession();

  let canChangePassword = false;
  try {
    const accountList = await auth.api.listUserAccounts({
      headers: await headers(),
    });
    const accounts = Array.isArray(accountList) ? (accountList as UserAccount[]) : [];
    canChangePassword = accounts.some((account) => account.providerId === "credential");
  } catch {
    canChangePassword = false;
  }

  return (
    <AppShell>
      <ProfileScreen
        initialName={session.user.name || "Cuenta"}
        email={session.user.email}
        initialImage={session.user.image || null}
        canChangePassword={canChangePassword}
      />
    </AppShell>
  );
}
