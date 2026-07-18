import { NextResponse } from "next/server";
import { secureRedirect, secureResponse } from "@/lib/security/api-security";
import { getOAuthBaseUrl, getOAuthStateCookieName } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return secureRedirect(new URL("/register?error=missing-google-client-id", getOAuthBaseUrl(request)));
  }

  const baseUrl = getOAuthBaseUrl(request);
  const state = crypto.randomUUID();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/google/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("access_type", "offline");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(getOAuthStateCookieName("google"), state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return secureResponse(response);
}
