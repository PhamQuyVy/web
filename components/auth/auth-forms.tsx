"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthState } from "@/app/actions";

const initialState: AuthState = {};

const linkedProviders = [
  { href: "/api/auth/google", label: "Gmail", mark: "G", className: "border-stone-300 text-slate-800" },
  { href: "/api/auth/facebook", label: "Facebook", mark: "f", className: "border-blue-200 text-blue-700" },
];

export function AuthForms() {
  const [loginState, login, loginPending] = useActionState(loginAction, initialState);

  return (
    <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold">Đăng nhập</h2>

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

      <div className="my-5 border-t border-stone-200" />

      <form action={login}>
        <label className="block text-sm font-medium" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          placeholder="Email"
          required
          type="email"
          className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 outline-none focus:border-orange-600"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="login-password">
          Mật khẩu
        </label>
        <input
          id="login-password"
          name="password"
          placeholder="Mật khẩu"
          required
          type="password"
          className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 outline-none focus:border-orange-600"
        />

        {loginState.message ? <p className="mt-3 text-sm text-red-700">{loginState.message}</p> : null}

        <button
          className="mt-5 h-11 w-full rounded-md border border-slate-900 bg-white px-4 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loginPending}
        >
          {loginPending ? "Đang kiểm tra..." : "Đăng nhập"}
        </button>
      </form>

      <div className="my-5 border-t border-stone-200" />

      <Link
        className="flex h-11 w-full items-center justify-center rounded-md bg-orange-600 px-4 font-semibold text-white hover:bg-orange-700"
        href="/register"
      >
        Đăng kí
      </Link>
    </div>
  );
}
