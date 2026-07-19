import pg from "pg";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("POSTGRES_URL or DATABASE_URL is required.");

const requiredTables = [
  "rate_limit_buckets",
  "sessions",
  "user_identities",
  "user_logins",
  "user_progress",
  "users",
];

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
  const tables = await pool.query(`
    select relname, relrowsecurity, relforcerowsecurity
    from pg_class
    where relname = any($1::text[])
  `, [requiredTables]);
  const tableMap = new Map(tables.rows.map((row) => [row.relname, row]));

  for (const table of requiredTables) {
    const state = tableMap.get(table);
    if (!state) throw new Error(`Missing security table: ${table}`);
    if (!state.relrowsecurity || !state.relforcerowsecurity) {
      throw new Error(`RLS is not enabled and forced on: ${table}`);
    }
  }

  const unsafeUsers = await pool.query(`
    select count(*)::int as count
    from users
    where (provider = 'email' and password_hash is not null and password_hash not like '$argon2id$%')
       or (provider in ('google', 'facebook') and password_hash is not null)
       or (phone_encrypted is not null and phone_encrypted not like 'enc:v1:%')
       or (address_encrypted is not null and address_encrypted not like 'enc:v1:%')
       or (oauth_refresh_token_encrypted is not null and oauth_refresh_token_encrypted not like 'enc:v1:%')
  `);
  if (unsafeUsers.rows[0].count > 0) {
    throw new Error(`${unsafeUsers.rows[0].count} user record(s) still need password or field migration.`);
  }

  const unsafeSessions = await pool.query(`
    select count(*)::int as count from sessions where id !~ '^[0-9a-f]{64}$'
  `);
  if (unsafeSessions.rows[0].count > 0) throw new Error("A session ID is not a SHA-256 digest.");

  console.log(`Security verification passed for ${requiredTables.length} protected tables.`);
} finally {
  await pool.end();
}
