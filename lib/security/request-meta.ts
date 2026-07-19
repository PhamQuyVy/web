import "server-only";

type HeaderReader = Pick<Headers, "get">;

export function getTrustedClientIp(headers: HeaderReader) {
  const forwarded = headers.get("x-vercel-forwarded-for") || headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim().slice(0, 64) || null;
}
