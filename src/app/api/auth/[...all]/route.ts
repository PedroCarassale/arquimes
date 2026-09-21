import { toNextJsHandler } from "better-auth/next-js";
import { auth, ensureAuthSchema } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

async function withSchema<T>(fn: () => Promise<T>) {
  await ensureAuthSchema();
  return fn();
}

export const GET = (request: Request) =>
  withSchema(() => handlers.GET(request));

export const POST = (request: Request) =>
  withSchema(() => handlers.POST(request));

export const PATCH = (request: Request) =>
  withSchema(() => handlers.PATCH(request));

export const PUT = (request: Request) =>
  withSchema(() => handlers.PUT(request));

export const DELETE = (request: Request) =>
  withSchema(() => handlers.DELETE(request));
