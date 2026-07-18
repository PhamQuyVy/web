import "server-only";

import argon2 from "argon2";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSession, deleteSession, findSession, findUserById } from "@/lib/db";

const sessionCookieName = "hanyu_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 14;

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

function verifyLegacyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const candidate = pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!storedHash) {
    return false;
  }

  if (storedHash.startsWith("$argon2id$")) {
    return argon2.verify(storedHash, password);
  }

  return verifyLegacyPassword(password, storedHash);
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
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
