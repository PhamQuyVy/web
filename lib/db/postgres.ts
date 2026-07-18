import "server-only";

import { Pool } from "pg";

function optionalEnv(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

function getPostgresConnectionString() {
  return optionalEnv("POSTGRES_URL") || optionalEnv("DATABASE_URL");
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
      ssl: optionalEnv("POSTGRES_SSL") === "false" ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }

  return global.postgresPool;
}
