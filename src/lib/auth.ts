import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { Kysely, SqliteDialect } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import {
  getLibsqlAuthToken,
  getLibsqlUrl,
  localSqlitePathFromUrl,
} from "./libsql";

let authDbInstance: Kysely<Record<string, never>> | null = null;
let authSchemaReady: Promise<void> | null = null;

function getAuthDb(): Kysely<Record<string, never>> {
  if (authDbInstance) return authDbInstance;

  const libsqlUrl = getLibsqlUrl();
  if (libsqlUrl.startsWith("file:")) {
    const sqlite = new Database(localSqlitePathFromUrl(libsqlUrl));
    sqlite.pragma("journal_mode = WAL");
    authDbInstance = new Kysely<Record<string, never>>({
      dialect: new SqliteDialect({ database: sqlite }),
    });
    return authDbInstance;
  }

  authDbInstance = new Kysely<Record<string, never>>({
    dialect: new LibsqlDialect({
      url: libsqlUrl,
      authToken: getLibsqlAuthToken(),
    }),
  });
  return authDbInstance;
}

const hasGoogleSecrets = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim()
);

function toOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    return new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`
    ).origin;
  } catch {
    return null;
  }
}

const betterAuthUrl = process.env.BETTER_AUTH_URL?.trim();
const staticTrustedOrigins = [
  betterAuthUrl,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_URL,
]
  .map(toOrigin)
  .filter((origin): origin is string => Boolean(origin));

function requestOrigins(request: Request | undefined): string[] {
  if (!request) return [];
  const origins: string[] = [];
  const fromUrl = toOrigin(request.url);
  if (fromUrl) origins.push(fromUrl);
  const behindVercel = Boolean(process.env.VERCEL);
  const host =
    (behindVercel &&
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()) ||
    request.headers.get("host")?.trim();
  if (host) {
    const proto =
      (behindVercel &&
        request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()) ||
      (fromUrl ? new URL(fromUrl).protocol.replace(":", "") : "https");
    const fromHost = toOrigin(`${proto}://${host}`);
    if (fromHost) origins.push(fromHost);
  }
  return origins;
}

export const isGoogleAuthEnabled = hasGoogleSecrets;

export const auth = betterAuth({
  appName: "Arquimedes",
  baseURL: betterAuthUrl,
  basePath: "/api/auth",
  secret:
    process.env.BETTER_AUTH_SECRET?.trim() ||
    "dev-only-insecure-secret-change-me",
  trustedOrigins: (request) => [
    ...new Set([...staticTrustedOrigins, ...requestOrigins(request)]),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: hasGoogleSecrets
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
        },
      }
    : undefined,
  database: {
    db: getAuthDb(),
    type: "sqlite",
  },
  onAPIError: {
    errorURL: "/login",
  },
  advanced: {
    database: {
      validateSchema: false,
    },
  },
  plugins: [nextCookies()],
});

export async function ensureAuthSchema(): Promise<void> {
  if (!authSchemaReady) {
    authSchemaReady = (async () => {
      const migration = await getMigrations(auth.options);
      await migration.runMigrations();
    })();
  }
  await authSchemaReady;
}
