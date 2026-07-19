import "server-only";

import {
  createOAuthIdentity,
  createUser,
  findUserByEmail,
  findUserByOAuthIdentity,
  updateOAuthUser,
} from "@/lib/db";

export type OAuthProvider = "google" | "facebook";

type OAuthProfile = {
  email: string;
  name: string;
  avatarUrl?: string | null;
  provider: OAuthProvider;
  providerAccountId: string;
  refreshToken?: string | null;
  emailVerified: boolean;
};

export class OAuthAccountLinkRequiredError extends Error {}

export function getOAuthBaseUrl(request: Request) {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const requestOrigin = new URL(request.url).origin;

  if (configuredAppUrl) {
    return configuredAppUrl;
  }

  return requestOrigin;
}

export function getOAuthStateCookieName(provider: OAuthProvider) {
  return `hanyu_oauth_${provider}_state`;
}

export async function signInOAuthProfile(profile: OAuthProfile) {
  const email = profile.email.toLowerCase();
  if (!profile.emailVerified) {
    throw new Error("OAuth provider email is not verified.");
  }

  const identityUser = await findUserByOAuthIdentity(profile.provider, profile.providerAccountId);
  if (identityUser) {
    await updateOAuthUser({
      id: identityUser.id,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      oauthRefreshToken: profile.refreshToken,
    });
    return identityUser;
  }

  if (await findUserByEmail(email)) {
    throw new OAuthAccountLinkRequiredError("Sign in to the existing account before linking OAuth.");
  }

  const user = await createUser({
      name: profile.name,
      email,
      passwordHash: null,
      avatarUrl: profile.avatarUrl,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      oauthRefreshToken: profile.refreshToken,
    });
  await createOAuthIdentity({
    userId: user.id,
    provider: profile.provider,
    providerAccountId: profile.providerAccountId,
    providerEmail: email,
    emailVerified: profile.emailVerified,
  });

  return user;
}

export function getOAuthErrorRedirect(request: Request, message: string) {
  const url = new URL("/register", getOAuthBaseUrl(request));
  url.searchParams.set("error", message);
  return url;
}
