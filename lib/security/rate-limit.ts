import "server-only";

import { createHash } from "crypto";
import { getPostgresPool, hasPostgresConfig } from "@/lib/db/postgres";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

declare global {
  var appRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

function getStore() {
  if (!global.appRateLimitStore) {
    global.appRateLimitStore = new Map<string, RateLimitEntry>();
  }
  return global.appRateLimitStore;
}

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function checkMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const store = getStore();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (!hasPostgresConfig()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Distributed rate limiting requires POSTGRES_URL in production.");
    }
    return checkMemoryRateLimit(key, limit, windowMs);
  }

  const result = await getPostgresPool().query(
    `
      WITH cleanup AS (
        DELETE FROM rate_limit_buckets
        WHERE reset_at < now() - interval '1 day'
      ), upsert AS (
        INSERT INTO rate_limit_buckets (key_hash, request_count, reset_at)
        VALUES ($1, 1, now() + ($2 * interval '1 millisecond'))
        ON CONFLICT (key_hash) DO UPDATE
        SET
          request_count = CASE
            WHEN rate_limit_buckets.reset_at <= now() THEN 1
            ELSE rate_limit_buckets.request_count + 1
          END,
          reset_at = CASE
            WHEN rate_limit_buckets.reset_at <= now()
              THEN now() + ($2 * interval '1 millisecond')
            ELSE rate_limit_buckets.reset_at
          END
        RETURNING request_count, reset_at
      )
      SELECT request_count, reset_at FROM upsert
    `,
    [hashKey(key), windowMs],
  );
  const row = result.rows[0] as { request_count: number | string; reset_at: Date | string };
  const count = Number(row.request_count);
  const resetAt = new Date(row.reset_at).getTime();

  return {
    allowed: count <= limit,
    retryAfterSeconds: count <= limit ? 0 : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
}

export async function resetRateLimit(key: string) {
  if (hasPostgresConfig()) {
    await getPostgresPool().query("DELETE FROM rate_limit_buckets WHERE key_hash = $1", [hashKey(key)]);
    return;
  }
  getStore().delete(key);
}
