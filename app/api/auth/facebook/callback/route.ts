import { createSessionCookie } from "@/lib/auth";
import { secureRedirect, secureResponse } from "@/lib/security/api-security";
import { recordUserLogin } from "@/lib/db";
import {
  getOAuthBaseUrl,
  getOAuthErrorRedirect,
  getOAuthStateCookieName,
  signInOAuthProfile,
} from "@/lib/auth/oauth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FacebookTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: {
    message?: string;
  };
};

type FacebookProfile = {
  id?: string;
  email?: string;
  name?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
};

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const storedState = request.cookies.get(getOAuthStateCookieName("facebook"))?.value;
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;

    if (!code || !state || !storedState || state !== storedState || !clientId || !clientSecret) {
      return secureRedirect(getOAuthErrorRedirect(request, "facebook-oauth-failed"));
    }

    const baseUrl = getOAuthBaseUrl(request);
    const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/facebook/callback`);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl);
    const token = (await tokenResponse.json()) as FacebookTokenResponse;

    if (!tokenResponse.ok || !token.access_token) {
      return secureRedirect(getOAuthErrorRedirect(request, "facebook-token-failed"));
    }

    const profileUrl = new URL("https://graph.facebook.com/me");
    profileUrl.searchParams.set("fields", "id,name,email,picture");
    profileUrl.searchParams.set("access_token", token.access_token);

    const profileResponse = await fetch(profileUrl);
    const profile = (await profileResponse.json()) as FacebookProfile;
    const fallbackEmail = profile.id ? `${profile.id}@facebook.oauth.local` : "";

    if (!profileResponse.ok || (!profile.email && !fallbackEmail)) {
      return secureRedirect(getOAuthErrorRedirect(request, "facebook-profile-failed"));
    }

    const user = await signInOAuthProfile({
      email: profile.email ?? fallbackEmail,
      name: profile.name || "Người học Facebook",
      avatarUrl: profile.picture?.data?.url,
      provider: "facebook",
      providerAccountId: profile.id || fallbackEmail,
      refreshToken: token.refresh_token,
    });
    const sessionCookie = await createSessionCookie(user.id);
    await recordUserLogin({
      userId: user.id,
      provider: "facebook",
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.redirect(new URL("/", baseUrl));
    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
    response.cookies.delete(getOAuthStateCookieName("facebook"));
    return secureResponse(response);
  } catch (error) {
    console.error("Facebook OAuth callback error:", error);
    return secureRedirect(getOAuthErrorRedirect(request, "facebook-callback-failed"));
  }
}
