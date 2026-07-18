import { NextRequest, NextResponse } from "next/server";
import {
  getOAuthBaseUrl,
  getOAuthErrorRedirect,
  getOAuthStateCookieName,
  signInOAuthProfile,
} from "@/lib/auth/oauth";
import { secureRedirect, secureResponse } from "@/lib/security/api-security";
import { createSessionCookie } from "@/lib/auth";
import { recordUserLogin } from "@/lib/db";

export const dynamic = "force-dynamic";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  picture?: string;
};

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const storedState = request.cookies.get(getOAuthStateCookieName("google"))?.value;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!code || !state || !storedState || state !== storedState || !clientId || !clientSecret) {
      return secureRedirect(getOAuthErrorRedirect(request, "google-oauth-failed"));
    }

    const baseUrl = getOAuthBaseUrl(request);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const token = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenResponse.ok || !token.access_token) {
      return secureRedirect(getOAuthErrorRedirect(request, "google-token-failed"));
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = (await profileResponse.json()) as GoogleUserInfo;

    if (!profileResponse.ok || !profile.email) {
      return secureRedirect(getOAuthErrorRedirect(request, "google-profile-failed"));
    }

    const user = await signInOAuthProfile({
      email: profile.email,
      name: profile.name || profile.given_name || "Người học Gmail",
      avatarUrl: profile.picture,
      provider: "google",
      providerAccountId: profile.sub || profile.email,
      refreshToken: token.refresh_token,
    });
    const sessionCookie = await createSessionCookie(user.id);
    await recordUserLogin({
      userId: user.id,
      provider: "google",
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.redirect(new URL("/", baseUrl));
    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
    response.cookies.delete(getOAuthStateCookieName("google"));
    return secureResponse(response);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return secureRedirect(getOAuthErrorRedirect(request, "google-callback-failed"));
  }
}
