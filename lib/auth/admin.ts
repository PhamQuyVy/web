import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isBootstrapAdminEmail(email: string) {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    return process.env.NODE_ENV !== "production";
  }

  return adminEmails.includes(email.trim().toLowerCase());
}

export function isAdminUser(user: { email: string; role: string }) {
  return user.role === "ADMIN" || isBootstrapAdminEmail(user.email);
}

export async function requireAdminUser() {
  const user = await requireUser();
  if (!isAdminUser(user)) {
    notFound();
  }

  return user;
}
