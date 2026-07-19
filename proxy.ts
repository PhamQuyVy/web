import { NextResponse, type NextRequest } from "next/server";

const blockedPathPatterns = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/wp-admin/i,
  /^\/wp-login\.php/i,
  /^\/phpmyadmin/i,
  /^\/adminer/i,
];

const blockedMethods = new Set(["TRACE", "TRACK"]);

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

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (blockedMethods.has(request.method.toUpperCase())) {
    return forbiddenJson("Phương thức request không được phép.", 405);
  }

  if (blockedPathPatterns.some((pattern) => pattern.test(pathname))) {
    return forbiddenJson("Đường dẫn bị chặn bởi firewall.", 404);
  }

  if (!isAllowedOrigin(request)) {
    return forbiddenJson("Nguồn gửi request không hợp lệ.");
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|file.svg|globe.svg|next.svg|vercel.svg|window.svg|images/.*).*)",
  ],
};
