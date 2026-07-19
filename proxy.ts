import { NextResponse, type NextRequest } from "next/server";

type RateLimitEntry = { count: number; resetAt: number };
type RateLimitRule = { key: string; limit: number; windowMs: number };

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
  globalThis.proxyRateLimitStore ??= new Map<string, RateLimitEntry>();
  return globalThis.proxyRateLimitStore;
}

function cleanupRateLimitStore(now: number) {
  if (now - (globalThis.proxyRateLimitLastCleanup ?? 0) < 60_000) return;
  for (const [key, entry] of getRateLimitStore()) {
    if (entry.resetAt <= now) getRateLimitStore().delete(key);
  }
  globalThis.proxyRateLimitLastCleanup = now;
}

function normalizeOrigin(value: string | undefined) {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function configuredOrigins() {
  return [
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.ALLOWED_ORIGINS ?? "").split(","),
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ].map((value) => normalizeOrigin(value?.trim())).filter(Boolean);
}

function isStateChangingMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function isAllowedOrigin(request: NextRequest) {
  if (!isStateChangingMethod(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return new Set([request.nextUrl.origin, ...configuredOrigins()]).has(origin);
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  ).slice(0, 64);
}

function getRateLimitRule(request: NextRequest): RateLimitRule {
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();
  const isAuthPath = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/api/auth");
  const isServerAction = method === "POST" && Boolean(request.headers.get("next-action"));

  if (isAuthPath) return { key: "auth", limit: 30, windowMs: 15 * 60 * 1000 };
  if (isServerAction) return { key: "server-action", limit: 120, windowMs: 5 * 60 * 1000 };
  if (isStateChangingMethod(method)) return { key: "write", limit: 80, windowMs: 60 * 1000 };
  if (pathname.startsWith("/api/")) return { key: "api", limit: 120, windowMs: 60 * 1000 };
  return { key: "page", limit: 300, windowMs: 60 * 1000 };
}

function checkBestEffortProxyRateLimit(request: NextRequest) {
  const now = Date.now();
  cleanupRateLimitStore(now);
  const rule = getRateLimitRule(request);
  const key = `${rule.key}:${getClientIp(request)}`;
  const existing = getRateLimitStore().get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + rule.windowMs;
    getRateLimitStore().set(key, { count: 1, resetAt });
    return { allowed: true, limit: rule.limit, remaining: rule.limit - 1, resetAt, retryAfterSeconds: 0 };
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
  const pathname = request.nextUrl.pathname;
  const isAuthPath = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/api/auth");
  return (
    request.url.length > maxUrlLength ||
    (request.headers.get("cookie") ?? "").length > maxCookieLength ||
    (request.headers.get("user-agent") ?? "").length > maxUserAgentLength ||
    (Number.isFinite(contentLength) && contentLength > (isAuthPath ? maxAuthBodyBytes : maxRequestBodyBytes))
  );
}

function buildContentSecurityPolicy(nonce: string, isDev: boolean) {
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
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=()");
  if (process.env.NODE_ENV !== "development") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return response;
}

function errorResponse(message: string, status: number, csp: string) {
  return applySecurityHeaders(NextResponse.json({ success: false, message }, { status }), csp);
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const pathname = request.nextUrl.pathname;

  if (blockedMethods.has(request.method.toUpperCase())) return errorResponse("Phương thức request không được phép.", 405, csp);
  if (blockedPathPatterns.some((pattern) => pattern.test(pathname))) return errorResponse("Đường dẫn bị chặn.", 404, csp);
  if (hasSuspiciousRequestShape(request)) return errorResponse("Request không hợp lệ hoặc quá lớn.", 413, csp);
  if (!isAllowedOrigin(request)) return errorResponse("Nguồn gửi request không hợp lệ.", 403, csp);

  const rateLimit = checkBestEffortProxyRateLimit(request);
  if (!rateLimit.allowed) {
    const response = errorResponse("Bạn gửi request quá nhanh. Vui lòng thử lại sau.", 429, csp);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
  response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetAt / 1000)));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|file.svg|globe.svg|next.svg|vercel.svg|window.svg|images/.*).*)"],
};
