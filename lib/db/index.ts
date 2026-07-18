import "server-only";

import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getPostgresPool, hasPostgresConfig } from "./postgres";
import { getDbPool, hasSqlServerConfig } from "./sql-server";
import { decryptField, encryptField, getEmailLookup } from "@/lib/security/privacy";
import type { AppDb, Lesson, ManagedUser, Session, User, UserProgress, VocabularyItem } from "@/lib/types";

const dbPath = path.join(process.cwd(), "data", "app-db.json");

async function readJsonDb(): Promise<AppDb> {
  const raw = await fs.readFile(dbPath, "utf8");
  return JSON.parse(raw) as AppDb;
}

async function writeJsonDb(db: AppDb) {
  await fs.writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

function toIsoDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function hashNullable(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return createHash("sha256").update(value).digest("hex");
}

const trustedPhraseMeanings: Record<string, string> = {
  放松心情: "thư giãn tâm trạng",
  减少压力: "giảm áp lực",
  增加信心: "tăng sự tự tin",
  提高效率: "nâng cao hiệu quả",
  解决问题: "giải quyết vấn đề",
  完成任务: "hoàn thành nhiệm vụ",
  安排时间: "sắp xếp thời gian",
  制定计划: "lập kế hoạch",
  改变习惯: "thay đổi thói quen",
  积累经验: "tích lũy kinh nghiệm",
  提出建议: "đưa ra lời khuyên",
  表达观点: "bày tỏ quan điểm",
  保持联系: "giữ liên lạc",
  保护环境: "bảo vệ môi trường",
  节约用水: "tiết kiệm nước",
  乘坐地铁: "đi tàu điện ngầm",
  预订酒店: "đặt khách sạn",
  购买门票: "mua vé vào cửa",
  办理入住: "làm thủ tục nhận phòng",
  参加会议: "tham gia cuộc họp",
  准备资料: "chuẩn bị tài liệu",
  申请工作: "ứng tuyển công việc",
  积累词汇: "tích lũy từ vựng",
  练习发音: "luyện phát âm",
  学习语法: "học ngữ pháp",
  复习生词: "ôn từ mới",
  介绍家人: "giới thiệu người nhà",
  照顾孩子: "chăm sóc trẻ em",
  尊重父母: "tôn trọng bố mẹ",
  点一杯茶: "gọi một ly trà",
  买一件衣服: "mua một bộ quần áo",
  打电话: "gọi điện thoại",
  发邮件: "gửi email",
  看新闻: "xem tin tức",
  写日记: "viết nhật ký",
};

const trustedPhraseMetadata: Record<string, { pinyin: string; hsk: number; topic: string }> = {
  放松心情: { pinyin: "fàng sōng xīn qíng", hsk: 4, topic: "Cảm xúc" },
  减少压力: { pinyin: "jiǎn shǎo yā lì", hsk: 4, topic: "Cảm xúc" },
  增加信心: { pinyin: "zēng jiā xìn xīn", hsk: 4, topic: "Cảm xúc" },
  提高效率: { pinyin: "tí gāo xiào lǜ", hsk: 5, topic: "Công việc" },
  解决问题: { pinyin: "jiě jué wèn tí", hsk: 4, topic: "Công việc" },
  完成任务: { pinyin: "wán chéng rèn wù", hsk: 4, topic: "Công việc" },
  安排时间: { pinyin: "ān pái shí jiān", hsk: 4, topic: "Thời gian" },
  制定计划: { pinyin: "zhì dìng jì huà", hsk: 5, topic: "Công việc" },
  改变习惯: { pinyin: "gǎi biàn xí guàn", hsk: 4, topic: "Đời sống" },
  积累经验: { pinyin: "jī lěi jīng yàn", hsk: 5, topic: "Công việc" },
  提出建议: { pinyin: "tí chū jiàn yì", hsk: 4, topic: "Giao tiếp" },
  表达观点: { pinyin: "biǎo dá guān diǎn", hsk: 5, topic: "Giao tiếp" },
  保持联系: { pinyin: "bǎo chí lián xì", hsk: 4, topic: "Giao tiếp" },
  保护环境: { pinyin: "bǎo hù huán jìng", hsk: 4, topic: "Thiên nhiên" },
  节约用水: { pinyin: "jié yuē yòng shuǐ", hsk: 4, topic: "Thiên nhiên" },
  乘坐地铁: { pinyin: "chéng zuò dì tiě", hsk: 4, topic: "Giao thông" },
  预订酒店: { pinyin: "yù dìng jiǔ diàn", hsk: 4, topic: "Du lịch" },
  购买门票: { pinyin: "gòu mǎi mén piào", hsk: 4, topic: "Du lịch" },
  办理入住: { pinyin: "bàn lǐ rù zhù", hsk: 5, topic: "Du lịch" },
  参加会议: { pinyin: "cān jiā huì yì", hsk: 4, topic: "Công việc" },
  准备资料: { pinyin: "zhǔn bèi zī liào", hsk: 4, topic: "Công việc" },
  申请工作: { pinyin: "shēn qǐng gōng zuò", hsk: 4, topic: "Công việc" },
  积累词汇: { pinyin: "jī lěi cí huì", hsk: 4, topic: "Học tập" },
  练习发音: { pinyin: "liàn xí fā yīn", hsk: 3, topic: "Học tập" },
  学习语法: { pinyin: "xué xí yǔ fǎ", hsk: 3, topic: "Học tập" },
  复习生词: { pinyin: "fù xí shēng cí", hsk: 3, topic: "Học tập" },
  介绍家人: { pinyin: "jiè shào jiā rén", hsk: 3, topic: "Gia đình" },
  照顾孩子: { pinyin: "zhào gù hái zi", hsk: 4, topic: "Gia đình" },
  尊重父母: { pinyin: "zūn zhòng fù mǔ", hsk: 4, topic: "Gia đình" },
  点一杯茶: { pinyin: "diǎn yì bēi chá", hsk: 2, topic: "Đồ ăn" },
  买一件衣服: { pinyin: "mǎi yí jiàn yī fu", hsk: 2, topic: "Mua sắm" },
  打电话: { pinyin: "dǎ diàn huà", hsk: 2, topic: "Giao tiếp" },
  发邮件: { pinyin: "fā yóu jiàn", hsk: 3, topic: "Công nghệ" },
  看新闻: { pinyin: "kàn xīn wén", hsk: 3, topic: "Đời sống" },
  写日记: { pinyin: "xiě rì jì", hsk: 3, topic: "Học tập" },
};

function isTrustedPhrase(item: VocabularyItem) {
  return Boolean(trustedPhraseMeanings[item.hanzi]);
}

function isReliableVocabularyItem(item: VocabularyItem) {
  return !item.id.includes("-phrase-") || isTrustedPhrase(item);
}

function normalizeVocabularyItem(item: VocabularyItem): VocabularyItem {
  const trustedMeaning = trustedPhraseMeanings[item.hanzi];
  if (!trustedMeaning) {
    return item;
  }

  return {
    ...item,
    type: "cụm từ",
    meaning: trustedMeaning,
    exampleMeaning: trustedMeaning,
  };
}

function getReliableVocabulary(vocabulary: VocabularyItem[]) {
  const reliable = vocabulary.filter(isReliableVocabularyItem).map(normalizeVocabularyItem);
  const existingHanzi = new Set(reliable.map((item) => item.hanzi));
  const trustedAdditions = Object.entries(trustedPhraseMeanings)
    .filter(([hanzi]) => !existingHanzi.has(hanzi))
    .map(([hanzi, meaning], index): VocabularyItem => {
      const meta = trustedPhraseMetadata[hanzi];
      return {
        id: `trusted-phrase-${index}`,
        hanzi,
        pinyin: meta.pinyin,
        type: "cụm từ",
        meaning,
        example: `${hanzi}。`,
        exampleMeaning: meaning,
        hsk: meta.hsk,
        topic: meta.topic,
      };
    });

  return [...reliable, ...trustedAdditions].sort((a, b) => {
    if (a.hsk !== b.hsk) {
      return a.hsk - b.hsk;
    }

    return a.id.localeCompare(b.id);
  });
}

function sanitizeLesson(
  lesson: Lesson,
  reliableVocabularyIds: Set<string>,
  reliablePhraseIds: Set<string>,
): Lesson {
  return {
    ...lesson,
    vocabularyIds: lesson.vocabularyIds.filter((id) => reliableVocabularyIds.has(id)),
    quiz: lesson.quiz.filter((question) => {
      if (!question.id.includes("-phrase-")) {
        return true;
      }

      return Array.from(reliablePhraseIds).some((id) => question.id.includes(id));
    }),
  };
}

function sanitizeLessons(db: AppDb) {
  const reliableVocabulary = getReliableVocabulary(db.vocabulary);
  const reliableVocabularyIds = new Set(reliableVocabulary.map((item) => item.id));
  const reliablePhraseIds = new Set(reliableVocabulary.filter((item) => item.id.includes("-phrase-")).map((item) => item.id));
  return db.lessons.map((lesson) => sanitizeLesson(lesson, reliableVocabularyIds, reliablePhraseIds));
}

function mapSqlUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: decryptField(row.full_name),
    email: decryptField(row.email),
    passwordHash: String(row.password_hash ?? ""),
    createdAt: toIsoDate(row.created_at),
  };
}

function mapSqlSession(row: Record<string, unknown>): Session {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    expiresAt: toIsoDate(row.expires_at),
  };
}

function mapSqlProgress(row: Record<string, unknown>): UserProgress {
  return {
    userId: String(row.user_id),
    completedLessonIds: parseJsonField<string[]>(row.completed_lesson_ids, []),
    lessonCompletions: parseJsonField<Record<string, string>>(row.lesson_completions, {}),
    quizAttempts: parseJsonField(row.quiz_attempts, []),
  };
}

function emptyProgress(userId: string): UserProgress {
  return {
    userId,
    completedLessonIds: [],
    lessonCompletions: {},
    quizAttempts: [],
  };
}

async function hasPrivacySchema() {
  if (!hasSqlServerConfig()) {
    return false;
  }

  const pool = await getDbPool();
  const result = await pool
    .request()
    .query("SELECT COL_LENGTH('dbo.Users', 'email_lookup') AS email_lookup_length");
  return Boolean(result.recordset[0]?.email_lookup_length);
}

async function hasSensitiveUserSchema() {
  if (!hasSqlServerConfig()) {
    return false;
  }

  const pool = await getDbPool();
  const result = await pool
    .request()
    .query(`
      SELECT
        COL_LENGTH('dbo.Users', 'phone_encrypted') AS phone_length,
        COL_LENGTH('dbo.Users', 'address_encrypted') AS address_length,
        COL_LENGTH('dbo.Users', 'oauth_refresh_token_encrypted') AS refresh_token_length
    `);
  const row = result.recordset[0];
  return Boolean(row?.phone_length && row?.address_length && row?.refresh_token_length);
}

async function hasUserLoginsSchema() {
  if (!hasSqlServerConfig()) {
    return false;
  }

  const pool = await getDbPool();
  const result = await pool
    .request()
    .query("SELECT OBJECT_ID(N'dbo.UserLogins', N'U') AS table_id");
  return Boolean(result.recordset[0]?.table_id);
}

export async function getHomeData() {
  const db = await readJsonDb();
  const vocabulary = getReliableVocabulary(db.vocabulary);

  return {
    skills: db.skills,
    roadmap: db.roadmap,
    todayVocabulary: vocabulary[0],
    knowledge: db.knowledge,
    curriculum: db.curriculum,
  };
}

export async function getLessons(): Promise<Lesson[]> {
  const db = await readJsonDb();
  return sanitizeLessons(db);
}

export async function getVocabulary(): Promise<VocabularyItem[]> {
  const db = await readJsonDb();
  return getReliableVocabulary(db.vocabulary);
}

export async function getLibraryData() {
  const db = await readJsonDb();
  return {
    grammarPatterns: db.grammarPatterns,
    dialogues: db.dialogues,
    listeningPractice: db.listeningPractice,
    readingPractice: db.readingPractice,
    writingPrompts: db.writingPrompts,
  };
}

export async function getLesson(id: string): Promise<Lesson | undefined> {
  const db = await readJsonDb();
  return sanitizeLessons(db).find((lesson) => lesson.id === id);
}

export async function getVocabularyByIds(ids: string[]): Promise<VocabularyItem[]> {
  const db = await readJsonDb();
  return ids
    .map((id) => db.vocabulary.find((item) => item.id === id))
    .filter((item): item is VocabularyItem => Boolean(item))
    .filter(isReliableVocabularyItem)
    .map(normalizeVocabularyItem);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  if (hasPostgresConfig()) {
    const result = await getPostgresPool().query(
      `
        SELECT id, email, full_name, password_hash, created_at
        FROM users
        WHERE email_lookup = $1 OR lower(email) = lower($2)
        LIMIT 1
      `,
      [getEmailLookup(email), email.toLowerCase()],
    );

    return result.rows[0] ? mapSqlUser(result.rows[0]) : undefined;
  }

  if (hasSqlServerConfig()) {
    const pool = await getDbPool();
    const privacyReady = await hasPrivacySchema();
    const request = pool.request().input("email", email.toLowerCase());
    if (privacyReady) {
      request.input("emailLookup", getEmailLookup(email));
    }

    const result = await request.query(`
      SELECT TOP 1 id, email, full_name, password_hash, created_at
      FROM dbo.Users
      WHERE ${privacyReady ? "email_lookup = @emailLookup OR" : ""} LOWER(email) = LOWER(@email)
    `);

    return result.recordset[0] ? mapSqlUser(result.recordset[0]) : undefined;
  }

  const db = await readJsonDb();
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export async function findUserById(id: string): Promise<User | undefined> {
  if (hasPostgresConfig()) {
    const result = await getPostgresPool().query(
      `
        SELECT id, email, full_name, password_hash, created_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ? mapSqlUser(result.rows[0]) : undefined;
  }

  if (hasSqlServerConfig()) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("id", id)
      .query(`
        SELECT TOP 1 id, email, full_name, password_hash, created_at
        FROM dbo.Users
        WHERE id = @id
      `);

    return result.recordset[0] ? mapSqlUser(result.recordset[0]) : undefined;
  }

  const db = await readJsonDb();
  return db.users.find((user) => user.id === id);
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string | null;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  provider?: "google" | "facebook" | "email" | null;
  providerAccountId?: string | null;
  oauthRefreshToken?: string | null;
}): Promise<User> {
  if (hasPostgresConfig()) {
    const result = await getPostgresPool().query(
      `
        INSERT INTO users (
          email,
          email_lookup,
          full_name,
          password_hash,
          avatar_url,
          provider,
          provider_account_id,
          phone_encrypted,
          address_encrypted,
          oauth_refresh_token_encrypted
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, email, full_name, password_hash, created_at
      `,
      [
        input.email.toLowerCase(),
        getEmailLookup(input.email),
        input.name,
        input.passwordHash,
        input.avatarUrl ?? null,
        input.provider ?? "email",
        input.providerAccountId ?? null,
        encryptField(input.phone),
        encryptField(input.address),
        encryptField(input.oauthRefreshToken),
      ],
    );

    const user = mapSqlUser(result.rows[0]);
    await ensurePostgresProgress(user.id);
    return user;
  }

  if (hasSqlServerConfig()) {
    const pool = await getDbPool();
    const lookupReady = await hasPrivacySchema();
    const sensitiveReady = await hasSensitiveUserSchema();
    const request = pool
      .request()
      .input("email", input.email.toLowerCase())
      .input("fullName", input.name)
      .input("passwordHash", input.passwordHash)
      .input("avatarUrl", input.avatarUrl ?? null)
      .input("provider", input.provider ?? "email")
      .input("providerAccountId", input.providerAccountId ?? null);

    if (lookupReady) {
      request.input("emailLookup", getEmailLookup(input.email));
    }

    if (sensitiveReady) {
      request.input("phone", encryptField(input.phone));
      request.input("address", encryptField(input.address));
      request.input("oauthRefreshToken", encryptField(input.oauthRefreshToken));
    }

    const result = await request.query(`
        INSERT INTO dbo.Users (
          email,
          ${lookupReady ? "email_lookup," : ""}
          full_name,
          password_hash,
          avatar_url,
          provider,
          provider_account_id
          ${sensitiveReady ? ", phone_encrypted, address_encrypted, oauth_refresh_token_encrypted" : ""}
        )
        OUTPUT inserted.id, inserted.email, inserted.full_name, inserted.password_hash, inserted.created_at
        VALUES (
          @email,
          ${lookupReady ? "@emailLookup," : ""}
          @fullName,
          @passwordHash,
          @avatarUrl,
          @provider,
          @providerAccountId
          ${sensitiveReady ? ", @phone, @address, @oauthRefreshToken" : ""}
        )
      `);

    const user = mapSqlUser(result.recordset[0]);
    await ensureSqlProgress(user.id);
    return user;
  }

  const db = await readJsonDb();
  const user: User = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash ?? "",
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  db.progress.push(emptyProgress(user.id));
  await writeJsonDb(db);
  return user;
}

export async function updateOAuthUser(input: {
  id: string;
  name: string;
  avatarUrl?: string | null;
  provider: "google" | "facebook";
  providerAccountId: string;
  oauthRefreshToken?: string | null;
}) {
  if (hasPostgresConfig()) {
    await getPostgresPool().query(
      `
        UPDATE users
        SET
          full_name = $2,
          avatar_url = $3,
          provider = $4,
          provider_account_id = $5,
          oauth_refresh_token_encrypted = COALESCE($6, oauth_refresh_token_encrypted),
          updated_at = now()
        WHERE id = $1
      `,
      [
        input.id,
        input.name,
        input.avatarUrl ?? null,
        input.provider,
        input.providerAccountId,
        encryptField(input.oauthRefreshToken),
      ],
    );
    return;
  }

  if (!hasSqlServerConfig()) {
    return;
  }

  const pool = await getDbPool();
  const sensitiveReady = await hasSensitiveUserSchema();
  const request = pool
    .request()
    .input("id", input.id)
    .input("fullName", input.name)
    .input("avatarUrl", input.avatarUrl ?? null)
    .input("provider", input.provider)
    .input("providerAccountId", input.providerAccountId);

  if (sensitiveReady) {
    request.input("oauthRefreshToken", encryptField(input.oauthRefreshToken));
  }

  await request.query(`
      UPDATE dbo.Users
      SET
        full_name = @fullName,
        avatar_url = @avatarUrl,
        provider = @provider,
        provider_account_id = @providerAccountId,
        ${sensitiveReady ? "oauth_refresh_token_encrypted = COALESCE(@oauthRefreshToken, oauth_refresh_token_encrypted)," : ""}
        updated_at = SYSDATETIME()
      WHERE id = @id
    `);
}

export async function recordUserLogin(input: {
  userId: string;
  provider: "email" | "google" | "facebook";
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  if (hasPostgresConfig()) {
    await getPostgresPool().query(
      `
        INSERT INTO user_logins (
          user_id,
          login_provider,
          ip_address_hash,
          user_agent
        )
        VALUES ($1, $2, $3, $4)
      `,
      [
        input.userId,
        input.provider,
        hashNullable(input.ipAddress),
        input.userAgent?.slice(0, 500) ?? null,
      ],
    );
    return;
  }

  if (!hasSqlServerConfig() || !(await hasUserLoginsSchema())) {
    return;
  }

  const pool = await getDbPool();
  await pool
    .request()
    .input("userId", input.userId)
    .input("loginProvider", input.provider)
    .input("ipAddressHash", hashNullable(input.ipAddress))
    .input("userAgent", input.userAgent?.slice(0, 500) ?? null)
    .query(`
      INSERT INTO dbo.UserLogins (
        user_id,
        login_provider,
        ip_address_hash,
        user_agent
      )
      VALUES (
        @userId,
        @loginProvider,
        @ipAddressHash,
        @userAgent
      )
    `);
}

export async function getManagedUsers(): Promise<ManagedUser[]> {
  if (hasPostgresConfig()) {
    const result = await getPostgresPool().query(`
      SELECT
        u.id,
        u.email,
        u.full_name,
        COALESCE(u.provider, 'email') AS provider,
        u.created_at,
        u.updated_at,
        COUNT(l.id) AS total_logins,
        SUM(CASE
          WHEN l.logged_in_at::date = now()::date
          THEN 1 ELSE 0
        END) AS logins_today,
        SUM(CASE
          WHEN date_trunc('month', l.logged_in_at) = date_trunc('month', now())
          THEN 1 ELSE 0
        END) AS logins_this_month,
        MAX(l.logged_in_at) AS last_login_at
      FROM users u
      LEFT JOIN user_logins l ON l.user_id = u.id
      GROUP BY
        u.id,
        u.email,
        u.full_name,
        u.provider,
        u.created_at,
        u.updated_at
      ORDER BY u.updated_at DESC
    `);

    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      email: decryptField(row.email),
      name: decryptField(row.full_name),
      provider: String(row.provider ?? "email"),
      createdAt: toIsoDate(row.created_at),
      updatedAt: toIsoDate(row.updated_at),
      totalLogins: Number(row.total_logins ?? 0),
      loginsToday: Number(row.logins_today ?? 0),
      loginsThisMonth: Number(row.logins_this_month ?? 0),
      lastLoginAt: row.last_login_at ? toIsoDate(row.last_login_at) : null,
    }));
  }

  if (hasSqlServerConfig() && (await hasUserLoginsSchema())) {
    const pool = await getDbPool();
    const result = await pool.request().query(`
      SELECT
        u.id,
        u.email,
        u.full_name,
        ISNULL(u.provider, 'email') AS provider,
        u.created_at,
        u.updated_at,
        COUNT(l.id) AS total_logins,
        SUM(CASE
          WHEN CONVERT(date, l.logged_in_at) = CONVERT(date, SYSDATETIME())
          THEN 1 ELSE 0
        END) AS logins_today,
        SUM(CASE
          WHEN YEAR(l.logged_in_at) = YEAR(SYSDATETIME())
           AND MONTH(l.logged_in_at) = MONTH(SYSDATETIME())
          THEN 1 ELSE 0
        END) AS logins_this_month,
        MAX(l.logged_in_at) AS last_login_at
      FROM dbo.Users u
      LEFT JOIN dbo.UserLogins l ON l.user_id = u.id
      GROUP BY
        u.id,
        u.email,
        u.full_name,
        u.provider,
        u.created_at,
        u.updated_at
      ORDER BY u.updated_at DESC
    `);

    return result.recordset.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      email: decryptField(row.email),
      name: decryptField(row.full_name),
      provider: String(row.provider ?? "email"),
      createdAt: toIsoDate(row.created_at),
      updatedAt: toIsoDate(row.updated_at),
      totalLogins: Number(row.total_logins ?? 0),
      loginsToday: Number(row.logins_today ?? 0),
      loginsThisMonth: Number(row.logins_this_month ?? 0),
      lastLoginAt: row.last_login_at ? toIsoDate(row.last_login_at) : null,
    }));
  }

  const db = await readJsonDb();
  return db.users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    provider: "email",
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
    totalLogins: 0,
    loginsToday: 0,
    loginsThisMonth: 0,
    lastLoginAt: null,
  }));
}

export async function createSession(userId: string, tokenHash: string): Promise<Session> {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  if (hasPostgresConfig()) {
    await getPostgresPool().query(
      `
        DELETE FROM sessions
        WHERE user_id = $1 OR expires_at <= now()
      `,
      [userId],
    );

    const result = await getPostgresPool().query(
      `
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, expires_at
      `,
      [tokenHash, userId, expiresAt],
    );

    return mapSqlSession(result.rows[0]);
  }

  if (hasSqlServerConfig()) {
    const pool = await getDbPool();
    await pool
      .request()
      .input("userId", userId)
      .query(`
        DELETE FROM dbo.Sessions
        WHERE user_id = @userId OR expires_at <= SYSDATETIME()
      `);

    const result = await pool
      .request()
      .input("id", tokenHash)
      .input("userId", userId)
      .input("expiresAt", expiresAt)
      .query(`
        INSERT INTO dbo.Sessions (id, user_id, expires_at)
        OUTPUT inserted.id, inserted.user_id, inserted.expires_at
        VALUES (@id, @userId, @expiresAt)
      `);

    return mapSqlSession(result.recordset[0]);
  }

  const db = await readJsonDb();
  const session: Session = {
    id: tokenHash,
    userId,
    expiresAt: expiresAt.toISOString(),
  };
  db.sessions = db.sessions.filter(
    (item) => item.userId !== userId && new Date(item.expiresAt).getTime() > Date.now(),
  );
  db.sessions.push(session);
  await writeJsonDb(db);
  return session;
}

export async function findSession(id: string): Promise<Session | undefined> {
  if (hasPostgresConfig()) {
    const result = await getPostgresPool().query(
      `
        SELECT id, user_id, expires_at
        FROM sessions
        WHERE id = $1 AND expires_at > now()
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ? mapSqlSession(result.rows[0]) : undefined;
  }

  if (hasSqlServerConfig()) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input("id", id)
      .query(`
        SELECT TOP 1 id, user_id, expires_at
        FROM dbo.Sessions
        WHERE id = @id AND expires_at > SYSDATETIME()
      `);

    return result.recordset[0] ? mapSqlSession(result.recordset[0]) : undefined;
  }

  const db = await readJsonDb();
  const session = db.sessions.find((item) => item.id === id);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return undefined;
  }
  return session;
}

export async function deleteSession(id: string) {
  if (hasPostgresConfig()) {
    await getPostgresPool().query("DELETE FROM sessions WHERE id = $1", [id]);
    return;
  }

  if (hasSqlServerConfig()) {
    const pool = await getDbPool();
    await pool.request().input("id", id).query("DELETE FROM dbo.Sessions WHERE id = @id");
    return;
  }

  const db = await readJsonDb();
  db.sessions = db.sessions.filter((item) => item.id !== id);
  await writeJsonDb(db);
}

async function ensurePostgresProgress(userId: string): Promise<UserProgress> {
  const existing = await getPostgresPool().query(
    `
      SELECT user_id, completed_lesson_ids, lesson_completions, quiz_attempts
      FROM user_progress
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (existing.rows[0]) {
    return mapSqlProgress(existing.rows[0]);
  }

  const result = await getPostgresPool().query(
    `
      INSERT INTO user_progress (user_id)
      VALUES ($1)
      RETURNING user_id, completed_lesson_ids, lesson_completions, quiz_attempts
    `,
    [userId],
  );

  return mapSqlProgress(result.rows[0]);
}

async function savePostgresProgress(progress: UserProgress) {
  await getPostgresPool().query(
    `
      INSERT INTO user_progress (
        user_id,
        completed_lesson_ids,
        lesson_completions,
        quiz_attempts,
        updated_at
      )
      VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, now())
      ON CONFLICT (user_id) DO UPDATE SET
        completed_lesson_ids = excluded.completed_lesson_ids,
        lesson_completions = excluded.lesson_completions,
        quiz_attempts = excluded.quiz_attempts,
        updated_at = now()
    `,
    [
      progress.userId,
      JSON.stringify(progress.completedLessonIds),
      JSON.stringify(progress.lessonCompletions),
      JSON.stringify(progress.quizAttempts),
    ],
  );
}

async function ensureSqlProgress(userId: string): Promise<UserProgress> {
  const pool = await getDbPool();
  const existing = await pool
    .request()
    .input("userId", userId)
    .query(`
      SELECT TOP 1 user_id, completed_lesson_ids, lesson_completions, quiz_attempts
      FROM dbo.UserProgress
      WHERE user_id = @userId
    `);

  if (existing.recordset[0]) {
    return mapSqlProgress(existing.recordset[0]);
  }

  const result = await pool
    .request()
    .input("userId", userId)
    .query(`
      INSERT INTO dbo.UserProgress (user_id)
      OUTPUT inserted.user_id, inserted.completed_lesson_ids, inserted.lesson_completions, inserted.quiz_attempts
      VALUES (@userId)
    `);

  return mapSqlProgress(result.recordset[0]);
}

async function saveSqlProgress(progress: UserProgress) {
  const pool = await getDbPool();
  await pool
    .request()
    .input("userId", progress.userId)
    .input("completedLessonIds", JSON.stringify(progress.completedLessonIds))
    .input("lessonCompletions", JSON.stringify(progress.lessonCompletions))
    .input("quizAttempts", JSON.stringify(progress.quizAttempts))
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

export async function getUserProgress(userId: string): Promise<UserProgress> {
  if (hasPostgresConfig()) {
    return ensurePostgresProgress(userId);
  }

  if (hasSqlServerConfig()) {
    return ensureSqlProgress(userId);
  }

  const db = await readJsonDb();
  let progress = db.progress.find((item) => item.userId === userId);
  if (!progress) {
    progress = emptyProgress(userId);
    db.progress.push(progress);
    await writeJsonDb(db);
  }
  return progress;
}

export async function completeLesson(userId: string, lessonId: string) {
  if (hasPostgresConfig()) {
    const progress = await getUserProgress(userId);
    if (!progress.completedLessonIds.includes(lessonId)) {
      progress.completedLessonIds.push(lessonId);
    }
    progress.lessonCompletions[lessonId] = new Date().toISOString();
    await savePostgresProgress(progress);
    return;
  }

  if (hasSqlServerConfig()) {
    const progress = await getUserProgress(userId);
    if (!progress.completedLessonIds.includes(lessonId)) {
      progress.completedLessonIds.push(lessonId);
    }
    progress.lessonCompletions[lessonId] = new Date().toISOString();
    await saveSqlProgress(progress);
    return;
  }

  const db = await readJsonDb();
  let progress = db.progress.find((item) => item.userId === userId);
  if (!progress) {
    progress = emptyProgress(userId);
    db.progress.push(progress);
  }

  if (!progress.completedLessonIds.includes(lessonId)) {
    progress.completedLessonIds.push(lessonId);
  }
  progress.lessonCompletions[lessonId] = new Date().toISOString();
  await writeJsonDb(db);
}

export async function recordStudyActivity(userId: string, activityId: string) {
  const key = activityId.startsWith("activity:") ? activityId : `activity:${activityId}`;

  if (hasPostgresConfig()) {
    const progress = await getUserProgress(userId);
    progress.lessonCompletions[key] = new Date().toISOString();
    await savePostgresProgress(progress);
    return;
  }

  if (hasSqlServerConfig()) {
    const progress = await getUserProgress(userId);
    progress.lessonCompletions[key] = new Date().toISOString();
    await saveSqlProgress(progress);
    return;
  }

  const db = await readJsonDb();
  let progress = db.progress.find((item) => item.userId === userId);
  if (!progress) {
    progress = emptyProgress(userId);
    db.progress.push(progress);
  }

  progress.lessonCompletions[key] = new Date().toISOString();
  await writeJsonDb(db);
}

export async function saveQuizAttempt(
  userId: string,
  lessonId: string,
  answers: Record<string, string>,
) {
  const lesson = await getLesson(lessonId);
  if (!lesson) {
    throw new Error("Lesson not found");
  }

  const correct = lesson.quiz.reduce(
    (score, question) => score + (answers[question.id] === question.answer ? 1 : 0),
    0,
  );
  const attempt = {
    lessonId,
    answers,
    correct,
    total: lesson.quiz.length,
    completedAt: new Date().toISOString(),
  };

  if (hasPostgresConfig()) {
    const progress = await getUserProgress(userId);
    progress.quizAttempts.push(attempt);
    await savePostgresProgress(progress);
    return { correct, total: lesson.quiz.length };
  }

  if (hasSqlServerConfig()) {
    const progress = await getUserProgress(userId);
    progress.quizAttempts.push(attempt);
    await saveSqlProgress(progress);
    return { correct, total: lesson.quiz.length };
  }

  const db = await readJsonDb();
  let progress = db.progress.find((item) => item.userId === userId);
  if (!progress) {
    progress = emptyProgress(userId);
    db.progress.push(progress);
  }

  progress.quizAttempts.push(attempt);
  await writeJsonDb(db);
  return { correct, total: lesson.quiz.length };
}
