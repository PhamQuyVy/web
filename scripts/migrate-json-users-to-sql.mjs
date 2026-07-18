import nextEnv from "@next/env";
import { createCipheriv, createHash, randomBytes } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import sql from "mssql";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value.trim();
}

const encryptedPrefix = "enc:v1:";

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

function getEmailLookup(email) {
  return createHash("sha256").update(String(email).trim().toLowerCase()).digest("hex");
}

async function main() {
  const dbPath = path.join(process.cwd(), "data", "app-db.json");
  const db = JSON.parse(readFileSync(dbPath, "utf8"));

  const pool = await sql.connect({
    server: requiredEnv("DB_SERVER"),
    database: requiredEnv("DB_NAME"),
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    options: {
      instanceName: process.env.DB_INSTANCE || undefined,
      encrypt: process.env.DB_ENCRYPT === "true",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    },
  });

  for (const user of db.users || []) {
    await pool
      .request()
      .input("id", user.id)
      .input("email", encryptField(user.email.toLowerCase()))
      .input("emailLookup", getEmailLookup(user.email))
      .input("fullName", encryptField(user.name))
      .input("passwordHash", user.passwordHash)
      .input("createdAt", new Date(user.createdAt))
      .query(`
        MERGE dbo.Users AS target
        USING (
          SELECT
            @id AS id,
            @email AS email,
            @emailLookup AS email_lookup,
            @fullName AS full_name,
            @passwordHash AS password_hash,
            @createdAt AS created_at
        ) AS source
        ON target.email_lookup = source.email_lookup
        WHEN MATCHED THEN
          UPDATE SET
            email = source.email,
            full_name = source.full_name,
            password_hash = source.password_hash,
            updated_at = SYSDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (id, email, email_lookup, full_name, password_hash, provider, created_at, updated_at)
          VALUES (source.id, source.email, source.email_lookup, source.full_name, source.password_hash, 'email', source.created_at, SYSDATETIME());
      `);
  }

  for (const progress of db.progress || []) {
    await pool
      .request()
      .input("userId", progress.userId)
      .input("completedLessonIds", JSON.stringify(progress.completedLessonIds || []))
      .input("lessonCompletions", JSON.stringify(progress.lessonCompletions || {}))
      .input("quizAttempts", JSON.stringify(progress.quizAttempts || []))
      .query(`
        MERGE dbo.UserProgress AS target
        USING (
          SELECT
            @userId AS user_id,
            @completedLessonIds AS completed_lesson_ids,
            @lessonCompletions AS lesson_completions,
            @quizAttempts AS quiz_attempts
        ) AS source
        ON target.user_id = source.user_id
        WHEN MATCHED THEN
          UPDATE SET
            completed_lesson_ids = source.completed_lesson_ids,
            lesson_completions = source.lesson_completions,
            quiz_attempts = source.quiz_attempts,
            updated_at = SYSDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (user_id, completed_lesson_ids, lesson_completions, quiz_attempts)
          VALUES (source.user_id, source.completed_lesson_ids, source.lesson_completions, source.quiz_attempts);
      `);
  }

  await pool.close();
  console.log(`Migrated ${(db.users || []).length} users and ${(db.progress || []).length} progress rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
