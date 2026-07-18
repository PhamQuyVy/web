import "server-only";

import { createUser, findUserByEmail, updateOAuthUser } from "@/lib/db";

export type OAuthProvider = "google" | "facebook";

type OAuthProfile = {
  email: string;
  name: string;
  avatarUrl?: string | null;
  provider: OAuthProvider;
  providerAccountId: string;
  refreshToken?: string | null;
};

export function getOAuthBaseUrl(request: Request) {
  const requestOrigin = new URL(request.url).origin;

  if (process.env.NODE_ENV === "production") {
    return requestOrigin;
  }

  return process.env.NEXT_PUBLIC_APP_URL || requestOrigin;
}

export function getOAuthStateCookieName(provider: OAuthProvider) {
  return `hanyu_oauth_${provider}_state`;
}

export async function signInOAuthProfile(profile: OAuthProfile) {
  const email = profile.email.toLowerCase();
  const existingUser = await findUserByEmail(email);
  const user =
    existingUser ??
    (await createUser({
      name: profile.name,
      email,
      passwordHash: null,
      avatarUrl: profile.avatarUrl,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      oauthRefreshToken: profile.refreshToken,
    }));

  if (existingUser) {
    await updateOAuthUser({
      id: user.id,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      oauthRefreshToken: profile.refreshToken,
    });
  }

  return user;
}

export function getOAuthErrorRedirect(request: Request, message: string) {
  const url = new URL("/register", getOAuthBaseUrl(request));
  url.searchParams.set("error", message);
  return url;
}
