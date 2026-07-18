import nextEnv from "@next/env";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import sql from "mssql";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const encryptedPrefix = "enc:v1:";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value.trim();
}

function getEncryptionKey() {
  const value = requiredEnv("APP_ENCRYPTION_KEY");
  const decoded = Buffer.from(value, "base64");
  return decoded.length === 32 ? decoded : createHash("sha256").update(value).digest();
}

function encryptField(value) {
  if (!value) {
    return null;
  }
  if (String(value).startsWith(encryptedPrefix)) {
    return String(value);
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    encryptedPrefix.slice(0, -1),
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

function decryptField(value) {
  if (typeof value !== "string" || !value.startsWith(encryptedPrefix)) {
    return typeof value === "string" ? value : null;
  }

  const [, version, iv, tag, ciphertext] = value.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) {
    return null;
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function emailLookup(email) {
  return createHash("sha256").update(String(email).trim().toLowerCase()).digest("hex");
}

async function main() {
  const pool = await sql.connect({
    server: requiredEnv("DB_SERVER"),
    database: requiredEnv("DB_NAME"),
    user: requiredEnv("DB_USER"),
    password: requiredEnv("DB_PASSWORD"),
    options: {
      instanceName: process.env.DB_INSTANCE || undefined,
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
  });

  const result = await pool.request().query(`
    SELECT
      id,
      email,
      full_name,
      provider,
      password_hash,
      avatar_url,
      phone_encrypted,
      address_encrypted,
      oauth_refresh_token_encrypted
    FROM dbo.Users
  `);

  for (const user of result.recordset) {
    const email = decryptField(user.email) ?? String(user.email || "");
    const fullName = decryptField(user.full_name) ?? String(user.full_name || "");
    const avatarUrl = decryptField(user.avatar_url);

    await pool
      .request()
      .input("id", String(user.id))
      .input("email", email.toLowerCase())
      .input("emailLookup", emailLookup(email))
      .input("fullName", fullName)
      .input("passwordHash", ["google", "facebook"].includes(String(user.provider)) ? null : user.password_hash)
      .input("avatarUrl", avatarUrl)
      .input("phone", encryptField(user.phone_encrypted))
      .input("address", encryptField(user.address_encrypted))
      .input("oauthRefreshToken", encryptField(user.oauth_refresh_token_encrypted))
      .query(`
        UPDATE dbo.Users
        SET
          email = @email,
          email_lookup = @emailLookup,
          full_name = @fullName,
          password_hash = @passwordHash,
          avatar_url = @avatarUrl,
          phone_encrypted = @phone,
          address_encrypted = @address,
          oauth_refresh_token_encrypted = @oauthRefreshToken,
          updated_at = SYSDATETIME()
        WHERE id = @id
      `);
  }

  await pool.close();
  console.log(`Normalized public fields and encrypted sensitive fields for ${result.recordset.length} users.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
