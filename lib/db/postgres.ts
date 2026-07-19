import "server-only";

import { Pool } from "pg";

function optionalEnv(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

function getPostgresConnectionString() {
  const rawUrl =
    optionalEnv("POSTGRES_URL") ||
    optionalEnv("DATABASE_URL");

  if (!rawUrl) {
    return "";
  }

  const url = new URL(rawUrl);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslcert");
  url.searchParams.delete("sslkey");
  url.searchParams.delete("sslrootcert");

  return url.toString();
}

export function assertProductionPostgresConfig() {
  if (process.env.NODE_ENV === "production" && !getPostgresConnectionString()) {
    throw new Error("POSTGRES_URL is required in production. JSON and SQL Server fallback are disabled.");
  }
}

export function hasPostgresConfig() {
  return Boolean(getPostgresConnectionString());
}

declare global {
  var postgresPool: Pool | undefined;
}

export function getPostgresPool() {
  if (!global.postgresPool) {
    const connectionString = getPostgresConnectionString();
    if (!connectionString) {
      throw new Error("Thiếu POSTGRES_URL hoặc DATABASE_URL cho Supabase/PostgreSQL");
    }

    global.postgresPool = new Pool({
      connectionString,
      ssl:
        optionalEnv("POSTGRES_SSL") === "false"
          ? false
          : optionalEnv("POSTGRES_CA_CERT")
            ? { ca: optionalEnv("POSTGRES_CA_CERT"), rejectUnauthorized: true }
            : { rejectUnauthorized: optionalEnv("POSTGRES_REJECT_UNAUTHORIZED") !== "false" },
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }

  return global.postgresPool;
}
