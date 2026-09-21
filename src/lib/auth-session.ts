import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth, ensureAuthSchema } from "./auth";

export class AuthRequiredError extends Error {
  constructor(message = "No autenticado.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export const getServerSession = cache(async () => {
  await ensureAuthSchema();
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function requireServerSession() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new AuthRequiredError();
  }
  return session;
}

export async function requireUserId(): Promise<string> {
  const session = await requireServerSession();
  return session.user.id;
}

export async function requirePageSession() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}
