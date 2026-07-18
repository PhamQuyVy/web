import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const encryptedPrefix = "enc:v1:";

function getEncryptionKey() {
  const value = process.env.APP_ENCRYPTION_KEY;
  if (!value) {
    throw new Error("Thiếu APP_ENCRYPTION_KEY trong .env.local");
  }

  const decoded = Buffer.from(value, "base64");
  return decoded.length === 32 ? decoded : createHash("sha256").update(value).digest();
}

export function getEmailLookup(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function encryptField(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.startsWith(encryptedPrefix)) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    encryptedPrefix.slice(0, -1),
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptField(value: unknown) {
  if (typeof value !== "string" || !value.startsWith(encryptedPrefix)) {
    return typeof value === "string" ? value : "";
  }

  const [, version, iv, tag, ciphertext] = value.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) {
    return "";
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
