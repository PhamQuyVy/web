import "server-only";

import sql from "mssql";

function optionalEnv(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

function requiredEnv(name: string) {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`Thiếu biến môi trường SQL Server: ${name}`);
  }
  return value;
}

export function hasSqlServerConfig() {
  return Boolean(
    optionalEnv("DB_SERVER") &&
      optionalEnv("DB_NAME") &&
      optionalEnv("DB_USER") &&
      optionalEnv("DB_PASSWORD"),
  );
}

function getSqlConfig(): sql.config {
  return {
    server: requiredEnv("DB_SERVER"),
    database: requiredEnv("DB_NAME"),
    user: requiredEnv("DB_USER"),
    password: requiredEnv("DB_PASSWORD"),
    options: {
      instanceName: optionalEnv("DB_INSTANCE") || undefined,
      encrypt: optionalEnv("DB_ENCRYPT") === "true",
      trustServerCertificate: optionalEnv("DB_TRUST_SERVER_CERTIFICATE") !== "false",
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

declare global {
  var sqlPoolPromise: Promise<sql.ConnectionPool> | undefined;
}

export function getDbPool(): Promise<sql.ConnectionPool> {
  if (!global.sqlPoolPromise) {
    global.sqlPoolPromise = new sql.ConnectionPool(getSqlConfig()).connect().catch((error) => {
      global.sqlPoolPromise = undefined;
      throw error;
    });
  }

  return global.sqlPoolPromise;
}

export { sql };
