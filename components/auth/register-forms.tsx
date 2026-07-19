"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { registerAction, type AuthState } from "@/app/actions";
import { passwordRequirements } from "@/lib/security/password-policy";

const initialState: AuthState = {};

const linkedProviders = [
  { href: "/api/auth/google", label: "Gmail", mark: "G", className: "border-stone-300 text-slate-800" },
  { href: "/api/auth/facebook", label: "Facebook", mark: "f", className: "border-blue-200 text-blue-700" },
];

const oauthErrors: Record<string, string> = {
  "missing-google-client-id": "Chưa cấu hình GOOGLE_CLIENT_ID.",
  "missing-facebook-client-id": "Chưa cấu hình FACEBOOK_CLIENT_ID.",
  "google-oauth-failed": "Không thể xác thực Gmail. Hãy thử lại.",
  "google-token-failed": "Không lấy được token Gmail.",
  "google-profile-failed": "Không lấy được email từ Gmail.",
  "google-callback-failed": "Đăng nhập Gmail chưa thành công. Vui lòng thử lại sau.",
  "oauth-account-exists": "Email này đã có tài khoản. Hãy đăng nhập bằng cách cũ trước khi liên kết tài khoản mạng xã hội.",
  "too-many-oauth-attempts": "Bạn thử đăng nhập quá nhiều lần. Vui lòng chờ rồi thử lại.",
  "facebook-oauth-failed": "Không thể xác thực Facebook. Hãy thử lại.",
  "facebook-token-failed": "Không lấy được token Facebook.",
  "facebook-profile-failed": "Không lấy được email từ Facebook.",
  "facebook-callback-failed": "Đăng nhập Facebook chưa thành công. Vui lòng thử lại sau.",
};

export function RegisterForms() {
  const [registerState, register, registerPending] = useActionState(registerAction, initialState);
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const oauthMessage = oauthError ? (oauthErrors[oauthError] ?? "Đăng ký liên kết chưa thành công.") : "";
  const passwordChecks = useMemo(
    () => passwordRequirements.map((requirement) => ({
      ...requirement,
      passed: requirement.test(password),
    })),
    [password],
  );
  const passwordReady = passwordChecks.every((item) => item.passed);

  return (
    <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold">Đăng ký</h2>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {linkedProviders.map((provider) => (
          <a
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold hover:bg-stone-50 ${provider.className}`}
            href={provider.href}
            key={provider.href}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
              {provider.mark}
            </span>
            {provider.label}
          </a>
        ))}
      </div>

      {oauthMessage ? <p className="mt-3 text-sm text-red-700">{oauthMessage}</p> : null}

      <div className="my-5 border-t border-stone-200" />

      <form action={register}>
        <label className="mt-4 block text-sm font-medium" htmlFor="register-name">
          Tên
        </label>
        <input
          autoComplete="name"
          className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 outline-none focus:border-orange-600"
          id="register-name"
          name="name"
          placeholder="Tên"
          required
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="register-email">
          Email
        </label>
        <input
          autoComplete="email"
          className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 outline-none focus:border-orange-600"
          id="register-email"
          name="email"
          placeholder="Email"
          required
          type="email"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="register-phone">
          Số điện thoại
        </label>
        <input
          autoComplete="tel"
          className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 outline-none focus:border-orange-600"
          id="register-phone"
          name="phone"
          placeholder="Số điện thoại"
          required
          type="tel"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="register-address">
          Địa chỉ
        </label>
        <textarea
          autoComplete="street-address"
          className="mt-2 min-h-20 w-full resize-none rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-orange-600"
          id="register-address"
          name="address"
          placeholder="Địa chỉ"
          required
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="register-password">
          Mật khẩu
        </label>
        <input
          autoComplete="new-password"
          className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 outline-none focus:border-orange-600"
          id="register-password"
          minLength={12}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mật khẩu"
          required
          type="password"
          value={password}
        />

        <div className="mt-3 rounded-md border border-stone-200 bg-[#fffdf5] p-3">
          <p className="text-sm font-semibold text-slate-700">Yêu cầu mật khẩu</p>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            {passwordChecks.map((item) => (
              <span className={item.passed ? "text-emerald-700" : "text-slate-500"} key={item.id}>
                {item.passed ? "✓" : "•"} {item.label}
              </span>
            ))}
          </div>
        </div>

        {registerState.message ? <p className="mt-3 text-sm text-red-700">{registerState.message}</p> : null}

        <label className="mt-4 flex items-start gap-2 text-sm leading-5 text-slate-600">
          <input className="mt-1" name="acceptTerms" required type="checkbox" value="yes" />
          <span>
            Tôi đồng ý với <Link className="font-semibold text-orange-700" href="/terms">điều khoản sử dụng</Link>
            {" "}và <Link className="font-semibold text-orange-700" href="/privacy">chính sách quyền riêng tư</Link>.
          </span>
        </label>

        <button
          className="mt-5 h-11 w-full rounded-md bg-orange-600 px-4 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={registerPending || !passwordReady}
        >
          {registerPending ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
      </form>

      <Link
        className="mt-5 flex h-11 w-full items-center justify-center rounded-md border border-stone-300 bg-white px-4 font-semibold hover:bg-stone-50"
        href="/login"
      >
        Quay lại đăng nhập
      </Link>
    </div>
  );
}
