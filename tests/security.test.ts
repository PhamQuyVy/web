import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isStrongPassword } from "../lib/security/password-policy";
import { hashPasswordValue, verifyPasswordValue } from "../lib/security/password-hash";
import { createSessionToken, hashSessionToken } from "../lib/security/session-token";
import { decryptField, encryptField, getEmailLookup } from "../lib/security/privacy";
import { calculateQuizScore } from "../lib/learning/quiz-score";
import { analyzeTranscript } from "../lib/learning/transcript-score";

describe("security primitives", () => {
  beforeEach(() => {
    process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("enforces the password policy", () => {
    expect(isStrongPassword("weak-password")).toBe(false);
    expect(isStrongPassword("StrongPass#2712")).toBe(true);
  });

  it("hashes passwords with Argon2id", async () => {
    const hash = await hashPasswordValue("StrongPass#2712");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPasswordValue("StrongPass#2712", hash)).resolves.toBe(true);
    await expect(verifyPasswordValue("wrong", hash)).resolves.toBe(false);
  });

  it("stores only a SHA-256 session identifier", () => {
    const token = createSessionToken();
    const storedId = hashSessionToken(token);
    expect(token).not.toBe(storedId);
    expect(storedId).toMatch(/^[0-9a-f]{64}$/);
  });

  it("encrypts PII with authenticated encryption", () => {
    const encrypted = encryptField("0900000000");
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain("0900000000");
    expect(decryptField(encrypted)).toBe("0900000000");
  });

  it("normalizes email lookup hashes", () => {
    expect(getEmailLookup(" User@Example.com ")).toBe(getEmailLookup("user@example.com"));
  });

  it("scores quiz answers without trusting client totals", () => {
    const questions = [{ id: "q1", answer: "A" }, { id: "q2", answer: "B" }];
    expect(calculateQuizScore(questions, { q1: "A", q2: "C" })).toBe(1);
  });

  it("scores exact transcripts and rejects empty speech", () => {
    expect(analyzeTranscript("你好吗？", "你好吗").score).toBe(100);
    expect(analyzeTranscript("你好吗", "").score).toBe(0);
  });
});
