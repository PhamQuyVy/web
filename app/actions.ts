"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { endSession, getCurrentUser, hashPassword, requireUser, startSession, verifyPassword } from "@/lib/auth";
import {
  completeLesson,
  createUser,
  findUserByEmail,
  getLesson,
  recordUserLogin,
  recordStudyActivity,
  saveQuizAttempt,
  updateUserPasswordHash,
} from "@/lib/db";
import { needsPasswordRehash } from "@/lib/security/password-hash";
import { getPasswordPolicyIssues } from "@/lib/security/password-policy";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import { getTrustedClientIp } from "@/lib/security/request-meta";

export type AuthState = {
  message?: string;
};

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getRequestMeta() {
  const headerStore = await headers();
  return {
    ipAddress: getTrustedClientIp(headerStore),
    userAgent: headerStore.get("user-agent"),
  };
}

function isSafeStudyActivityId(activityId: string) {
  const value = activityId.trim();
  const allowedExactIds = new Set(["grammar", "vocabulary", "writing", "speaking", "pinyin"]);
  const allowedPrefixes = [
    "lesson:",
    "vocabulary:",
    "listen:word:",
    "listen:sentence:",
    "writing:",
    "pinyin:",
    "speaking:",
  ];

  if (!value || value.length > 120 || /[\u0000-\u001f\u007f]/.test(value)) {
    return false;
  }

  return allowedExactIds.has(value) || allowedPrefixes.some((prefix) => value.startsWith(prefix));
}

export async function registerAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const name = textValue(formData, "name");
  const email = textValue(formData, "email").toLowerCase();
  const phone = textValue(formData, "phone");
  const address = textValue(formData, "address");
  const password = textValue(formData, "password");
  const acceptedTerms = textValue(formData, "acceptTerms") === "yes";
  const requestMeta = await getRequestMeta();
  const [registerLimit, registerIpLimit] = await Promise.all([
    checkRateLimit(`register:${email || "unknown"}`, 5, 15 * 60 * 1000),
    checkRateLimit(`register-ip:${requestMeta.ipAddress || "unknown"}`, 20, 15 * 60 * 1000),
  ]);

  if (!registerLimit.allowed || !registerIpLimit.allowed) {
    return { message: `Thử lại sau ${Math.max(registerLimit.retryAfterSeconds, registerIpLimit.retryAfterSeconds)} giây.` };
  }

  if (name.length < 2 || !email.includes("@")) {
    return { message: "Nhập tên và email hợp lệ." };
  }

  if (!acceptedTerms) {
    return { message: "Bạn cần đồng ý với điều khoản và chính sách quyền riêng tư." };
  }

  if (!/^[0-9+\s().-]{8,20}$/.test(phone) || address.length < 5) {
    return { message: "Nhập số điện thoại và địa chỉ hợp lệ." };
  }

  const passwordIssues = getPasswordPolicyIssues(password);
  if (passwordIssues.length > 0) {
    return { message: `Mật khẩu chưa đủ mạnh: ${passwordIssues.map((issue) => issue.label.toLowerCase()).join(", ")}.` };
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return { message: "Không thể tạo tài khoản với thông tin này. Hãy đăng nhập hoặc dùng email khác." };
  }

  const user = await createUser({
    name,
    email,
    phone,
    address,
    passwordHash: await hashPassword(password),
  });
  await resetRateLimit(`register:${email}`);
  await startSession(user.id);
  await recordUserLogin({
    userId: user.id,
    provider: "email",
    ...requestMeta,
  });
  redirect("/");
}

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = textValue(formData, "email").toLowerCase();
  const password = textValue(formData, "password");
  const requestMeta = await getRequestMeta();
  const [loginLimit, loginIpLimit] = await Promise.all([
    checkRateLimit(`login:${email || "unknown"}`, 8, 15 * 60 * 1000),
    checkRateLimit(`login-ip:${requestMeta.ipAddress || "unknown"}`, 40, 15 * 60 * 1000),
  ]);

  if (!loginLimit.allowed || !loginIpLimit.allowed) {
    return { message: `Thử lại sau ${Math.max(loginLimit.retryAfterSeconds, loginIpLimit.retryAfterSeconds)} giây.` };
  }

  const user = await findUserByEmail(email);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { message: "Email hoặc mật khẩu không đúng." };
  }

  if (needsPasswordRehash(user.passwordHash)) {
    await updateUserPasswordHash(user.id, await hashPassword(password));
  }

  await resetRateLimit(`login:${email}`);
  await startSession(user.id);
  await recordUserLogin({
    userId: user.id,
    provider: "email",
    ...requestMeta,
  });
  redirect("/");
}

export async function logoutAction() {
  await endSession();
  redirect("/intro");
}

export async function completeLessonAction(formData: FormData) {
  const user = await requireUser();
  const lessonId = textValue(formData, "lessonId");
  const lesson = await getLesson(lessonId);
  if (!lesson) {
    redirect("/dashboard");
  }

  await completeLesson(user.id, lessonId);
  revalidatePath("/dashboard");
  revalidatePath(`/lesson/${lessonId}`);
  redirect(`/quiz/${lessonId}`);
}

export async function submitQuizAction(formData: FormData) {
  const user = await requireUser();
  const quizLimit = await checkRateLimit(`quiz:${user.id}`, 30, 10 * 60 * 1000);
  if (!quizLimit.allowed) {
    redirect("/dashboard?error=too-many-quiz-submissions");
  }
  const lessonId = textValue(formData, "lessonId");
  const lesson = await getLesson(lessonId);
  if (!lesson) {
    redirect("/dashboard");
  }

  const answers = Object.fromEntries(
    lesson.quiz.map((question) => [question.id, textValue(formData, question.id)]),
  );
  await saveQuizAttempt(user.id, lessonId, answers);
  revalidatePath("/dashboard");
  revalidatePath(`/quiz/${lessonId}`);
  redirect(`/quiz/${lessonId}?done=1`);
}

export async function recordStudyActivityAction(activityId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  if (!isSafeStudyActivityId(activityId)) {
    return;
  }

  const activityLimit = await checkRateLimit(`activity:${user.id}`, 300, 5 * 60 * 1000);
  if (!activityLimit.allowed) {
    return;
  }

  await recordStudyActivity(user.id, activityId.trim());
  revalidatePath("/dashboard");
}
