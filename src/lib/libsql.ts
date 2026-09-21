import { createClient, type Client } from "@libsql/client";

const DEFAULT_LIBSQL_URL = "file:.arquimes-data.db";

let clientInstance: Client | null = null;

export function getLibsqlUrl(): string {
  return process.env.LIBSQL_URL?.trim() || DEFAULT_LIBSQL_URL;
}

export function getLibsqlAuthToken(): string | undefined {
  const token = process.env.LIBSQL_AUTH_TOKEN?.trim();
  return token || undefined;
}

export function getLibsqlClient(): Client {
  if (clientInstance) return clientInstance;
  clientInstance = createClient({
    url: getLibsqlUrl(),
    authToken: getLibsqlAuthToken(),
  });
  return clientInstance;
}

export function localSqlitePathFromUrl(url: string): string {
  const raw = url.startsWith("file:") ? url.slice("file:".length) : url;
  const [withoutQuery] = raw.split("?");
  return withoutQuery || ".arquimes-data.db";
}
