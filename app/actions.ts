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
} from "@/lib/db";
import { getPasswordPolicyIssues } from "@/lib/security/password-policy";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

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
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent"),
  };
}

export async function registerAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const name = textValue(formData, "name");
  const email = textValue(formData, "email").toLowerCase();
  const phone = textValue(formData, "phone");
  const address = textValue(formData, "address");
  const password = textValue(formData, "password");
  const registerLimit = checkRateLimit(`register:${email || "unknown"}`, 5, 15 * 60 * 1000);

  if (!registerLimit.allowed) {
    return { message: `Thử lại sau ${registerLimit.retryAfterSeconds} giây.` };
  }

  if (name.length < 2 || !email.includes("@")) {
    return { message: "Nhập tên và email hợp lệ." };
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
    return { message: "Email này đã được đăng ký." };
  }

  const user = await createUser({
    name,
    email,
    phone,
    address,
    passwordHash: await hashPassword(password),
  });
  resetRateLimit(`register:${email}`);
  await startSession(user.id);
  await recordUserLogin({
    userId: user.id,
    provider: "email",
    ...(await getRequestMeta()),
  });
  redirect("/");
}

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = textValue(formData, "email").toLowerCase();
  const password = textValue(formData, "password");
  const loginLimit = checkRateLimit(`login:${email || "unknown"}`, 8, 15 * 60 * 1000);

  if (!loginLimit.allowed) {
    return { message: `Thử lại sau ${loginLimit.retryAfterSeconds} giây.` };
  }

  const user = await findUserByEmail(email);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { message: "Email hoặc mật khẩu không đúng." };
  }

  resetRateLimit(`login:${email}`);
  await startSession(user.id);
  await recordUserLogin({
    userId: user.id,
    provider: "email",
    ...(await getRequestMeta()),
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

  await recordStudyActivity(user.id, activityId);
  revalidatePath("/dashboard");
}
