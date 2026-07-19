import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("POSTGRES_URL or DATABASE_URL is required.");
}

const schemaPath = path.join(process.cwd(), "scripts", "supabase-schema.sql");
const schema = await readFile(schemaPath, "utf8");
const pool = new pg.Pool({
  connectionString,
  ssl:
    process.env.POSTGRES_SSL === "false"
      ? false
      : process.env.POSTGRES_CA_CERT
        ? { ca: process.env.POSTGRES_CA_CERT, rejectUnauthorized: true }
        : { rejectUnauthorized: process.env.POSTGRES_REJECT_UNAUTHORIZED !== "false" },
  max: 1,
});

try {
  await pool.query(schema);
  console.log("PostgreSQL schema migration completed.");
} finally {
  await pool.end();
}
