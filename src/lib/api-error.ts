import { NextResponse } from "next/server";
import { AuthRequiredError } from "./auth-session";

export function apiErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status: 500 });
}
