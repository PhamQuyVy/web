import "server-only";

import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { optionalServerSecret } from "@/lib/security/server-secrets";

type JsonValue = Record<string, unknown> | unknown[];

const apiSecurityHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  Vary: "Cookie",
};

export function secureResponse<T extends NextResponse>(response: T): T {
  for (const [key, value] of Object.entries(apiSecurityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export function secureJson(body: JsonValue, init?: ResponseInit) {
  return secureResponse(NextResponse.json(body, init));
}

export function secureRedirect(url: URL | string) {
  return secureResponse(NextResponse.redirect(url));
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: secureJson(
        {
          success: false,
          message: "Bạn cần đăng nhập để dùng API này.",
        },
        { status: 401 },
      ),
    };
  }

  return { user, response: null };
}

export function isTrustedOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set([
    requestUrl.origin,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean));

  return allowedOrigins.has(origin);
}

export function forbiddenOriginJson() {
  return secureJson(
    {
      success: false,
      message: "Nguồn gửi request không hợp lệ.",
    },
    { status: 403 },
  );
}

function safeEqualText(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function requireInternalApiKey(request: Request, envName = "INTERNAL_API_KEY") {
  const expectedKey = optionalServerSecret(envName);
  if (!expectedKey) {
    return secureJson(
      {
        success: false,
        message: "API key nội bộ chưa được cấu hình.",
      },
      { status: 500 },
    );
  }

  const actualKey = request.headers.get("x-api-key") ?? "";
  if (!actualKey || !safeEqualText(actualKey, expectedKey)) {
    return secureJson(
      {
        success: false,
        message: "API key không hợp lệ.",
      },
      { status: 401 },
    );
  }

  return null;
}
