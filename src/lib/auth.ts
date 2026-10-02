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

const trustedOriginSet = new Set<string>();
const betterAuthUrl = process.env.BETTER_AUTH_URL?.trim();
if (betterAuthUrl) trustedOriginSet.add(betterAuthUrl);
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
if (appUrl) trustedOriginSet.add(appUrl);

export const isGoogleAuthEnabled = hasGoogleSecrets;

export const auth = betterAuth({
  appName: "Arquimedes",
  baseURL: betterAuthUrl,
  basePath: "/api/auth",
  secret:
    process.env.BETTER_AUTH_SECRET?.trim() ||
    "dev-only-insecure-secret-change-me",
  trustedOrigins: [...trustedOriginSet],
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
