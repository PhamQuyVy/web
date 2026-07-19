import { NextResponse, type NextRequest } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

const blockedPathPatterns = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.aws/i,
  /^\/\.ssh/i,
  /^\/\.well-known\/.*(?:passwd|shadow|env)/i,
  /^\/wp-admin/i,
  /^\/wp-login\.php/i,
  /^\/phpmyadmin/i,
  /^\/adminer/i,
  /^\/server-status/i,
  /^\/vendor\/phpunit/i,
];

const blockedMethods = new Set(["TRACE", "TRACK"]);
const maxRequestBodyBytes = 600 * 1024;
const maxAuthBodyBytes = 32 * 1024;
const maxUrlLength = 2048;
const maxCookieLength = 4096;
const maxUserAgentLength = 500;

declare global {
  var proxyRateLimitStore: Map<string, RateLimitEntry> | undefined;
  var proxyRateLimitLastCleanup: number | undefined;
}

function getRateLimitStore() {
  if (!globalThis.proxyRateLimitStore) {
    globalThis.proxyRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalThis.proxyRateLimitStore;
}

function cleanupRateLimitStore(now: number) {
  const lastCleanup = globalThis.proxyRateLimitLastCleanup ?? 0;
  if (now - lastCleanup < 60_000) {
    return;
  }

  const store = getRateLimitStore();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }

  globalThis.proxyRateLimitLastCleanup = now;
}

function normalizeOrigin(value: string | undefined) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function getAllowedOrigins(request: NextRequest) {
  return new Set(
    [
      request.nextUrl.origin,
      normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL),
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    ].filter(Boolean),
  );
}

function isStateChangingMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function isAllowedOrigin(request: NextRequest) {
  if (!isStateChangingMethod(request.method)) {
    return true;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  return getAllowedOrigins(request).has(origin);
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function getRateLimitRule(request: NextRequest): RateLimitRule {
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();
  const isAuthPath = pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth");
  const isApiPath = pathname.startsWith("/api/");
  const isServerAction = method === "POST" && Boolean(request.headers.get("next-action"));

  if (isAuthPath) {
    return { key: "auth", limit: 30, windowMs: 15 * 60 * 1000 };
  }

  if (isServerAction) {
    return { key: "server-action", limit: 120, windowMs: 5 * 60 * 1000 };
  }

  if (isStateChangingMethod(method)) {
    return { key: "write", limit: 80, windowMs: 60 * 1000 };
  }

  if (isApiPath) {
    return { key: "api", limit: 120, windowMs: 60 * 1000 };
  }

  return { key: "page", limit: 300, windowMs: 60 * 1000 };
}

function checkRateLimit(request: NextRequest) {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const rule = getRateLimitRule(request);
  const key = `${rule.key}:${getClientIp(request)}`;
  const store = getRateLimitStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + rule.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: rule.limit,
      remaining: rule.limit - 1,
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= rule.limit) {
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

function hasSuspiciousRequestShape(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  const cookie = request.headers.get("cookie") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";
  const pathname = request.nextUrl.pathname;
  const isAuthPath = pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth");

  if (request.url.length > maxUrlLength || cookie.length > maxCookieLength || userAgent.length > maxUserAgentLength) {
    return true;
  }

  if (Number.isFinite(contentLength) && contentLength > (isAuthPath ? maxAuthBodyBytes : maxRequestBodyBytes)) {
    return true;
  }

  return false;
}

function buildContentSecurityPolicy(isDev: boolean) {
  const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
  const connectSrc = [
    "'self'",
    "https://accounts.google.com",
    "https://oauth2.googleapis.com",
    "https://www.googleapis.com",
    "https://www.facebook.com",
    "https://graph.facebook.com",
    "https://*.supabase.com",
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com https://www.facebook.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse) {
  const isDev = process.env.NODE_ENV === "development";

  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(isDev));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=()");

  if (!isDev) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}

function forbiddenJson(message: string, status = 403) {
  return applySecurityHeaders(
    NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    ),
  );
}

function rateLimitedJson(result: ReturnType<typeof checkRateLimit>) {
  const response = forbiddenJson("Bạn gửi request quá nhanh. Vui lòng thử lại sau.", 429);
  response.headers.set("Retry-After", String(result.retryAfterSeconds));
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  return response;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (blockedMethods.has(request.method.toUpperCase())) {
    return forbiddenJson("Phương thức request không được phép.", 405);
  }

  if (blockedPathPatterns.some((pattern) => pattern.test(pathname))) {
    return forbiddenJson("Đường dẫn bị chặn bởi firewall.", 404);
  }

  if (hasSuspiciousRequestShape(request)) {
    return forbiddenJson("Request không hợp lệ hoặc quá lớn.", 413);
  }

  if (!isAllowedOrigin(request)) {
    return forbiddenJson("Nguồn gửi request không hợp lệ.");
  }

  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return rateLimitedJson(rateLimit);
  }

  const response = applySecurityHeaders(NextResponse.next());
  response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
  response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetAt / 1000)));
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|file.svg|globe.svg|next.svg|vercel.svg|window.svg|images/.*).*)",
  ],
};
