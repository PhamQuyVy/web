import argon2 from "argon2";
import { pbkdf2Sync, timingSafeEqual } from "crypto";

export async function hashPasswordValue(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

function verifyLegacyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidate = pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

export async function verifyPasswordValue(password: string, storedHash: string) {
  if (!storedHash) return false;
  if (storedHash.startsWith("$argon2id$")) return argon2.verify(storedHash, password);
  return verifyLegacyPassword(password, storedHash);
}

export function needsPasswordRehash(storedHash: string) {
  return !storedHash.startsWith("$argon2id$");
}
