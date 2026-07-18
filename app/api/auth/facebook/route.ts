import { NextResponse } from "next/server";
import { secureRedirect, secureResponse } from "@/lib/security/api-security";
import { getOAuthBaseUrl, getOAuthStateCookieName } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientId = process.env.FACEBOOK_CLIENT_ID;

  if (!clientId) {
    return secureRedirect(new URL("/register?error=missing-facebook-client-id", getOAuthBaseUrl(request)));
  }

  const baseUrl = getOAuthBaseUrl(request);
  const state = crypto.randomUUID();
  const authUrl = new URL("https://www.facebook.com/v20.0/dialog/oauth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/facebook/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "email,public_profile");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(getOAuthStateCookieName("facebook"), state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return secureResponse(response);
}
