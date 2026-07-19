import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSession, deleteSession, findSession, findUserById } from "@/lib/db";
import { hashPasswordValue, verifyPasswordValue } from "@/lib/security/password-hash";
import { createSessionToken, hashSessionToken } from "@/lib/security/session-token";

const sessionCookieName = "hanyu_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 14;

export async function hashPassword(password: string) {
  return hashPasswordValue(password);
}

export async function verifyPassword(password: string, storedHash: string) {
  return verifyPasswordValue(password, storedHash);
}

export async function createSessionCookie(userId: string) {
  const token = createSessionToken();
  const session = await createSession(userId, hashSessionToken(token));
  return {
    name: sessionCookieName,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(sessionDurationMs / 1000),
      expires: new Date(session.expiresAt),
    },
  };
}

export async function startSession(userId: string) {
  const sessionCookie = await createSessionCookie(userId);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
}

export async function endSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookieName)?.value;
  if (sessionId) {
    await deleteSession(hashSessionToken(sessionId));
  }
  cookieStore.delete(sessionCookieName);
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookieName)?.value;
  if (!sessionId) {
    return null;
  }

  const session = await findSession(hashSessionToken(sessionId));
  if (!session) {
    return null;
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
