import "server-only";

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

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const store = getStore();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export function resetRateLimit(key: string) {
  getStore().delete(key);
}
