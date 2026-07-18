import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { requireUser } from "@/lib/auth";
import { getManagedUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) {
    return "Chưa có";
  }

  return new Date(value).toLocaleString("vi");
}

export default async function AdminUsersPage() {
  await requireUser();
  const users = await getManagedUsers();
  const totalToday = users.reduce((sum, user) => sum + user.loginsToday, 0);
  const totalThisMonth = users.reduce((sum, user) => sum + user.loginsThisMonth, 0);
  const totalLogins = users.reduce((sum, user) => sum + user.totalLogins, 0);

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />
      <section className="mx-auto max-w-[1040px] px-5 py-6">
        <Link className="text-sm font-semibold text-orange-700 hover:text-orange-800" href="/dashboard">
          ← Về dashboard
        </Link>

        <div className="mt-4 rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Quản lý người dùng</p>
          <h1 className="mt-2 text-3xl font-bold">Tài khoản và lượt đăng nhập</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            `Users` lưu thông tin đăng ký. `UserLogins` lưu lịch sử đăng nhập để đếm theo ngày và tháng.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Người dùng</p>
              <p className="mt-1 text-lg font-semibold">{users.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Hôm nay</p>
              <p className="mt-1 text-lg font-semibold">{totalToday}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Tháng này</p>
              <p className="mt-1 text-lg font-semibold">{totalThisMonth}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Tổng lượt vào</p>
              <p className="mt-1 text-lg font-semibold">{totalLogins}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead className="bg-[#fffdf5] text-xs uppercase text-slate-500">
                <tr>
                  <th className="border-b border-stone-200 px-4 py-3">Người dùng</th>
                  <th className="border-b border-stone-200 px-4 py-3">Provider</th>
                  <th className="border-b border-stone-200 px-4 py-3">Hôm nay</th>
                  <th className="border-b border-stone-200 px-4 py-3">Tháng này</th>
                  <th className="border-b border-stone-200 px-4 py-3">Tổng</th>
                  <th className="border-b border-stone-200 px-4 py-3">Lần cuối</th>
                  <th className="border-b border-stone-200 px-4 py-3">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr className="border-b border-stone-100 last:border-b-0" key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{user.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                        {user.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{user.loginsToday}</td>
                    <td className="px-4 py-3 font-semibold">{user.loginsThisMonth}</td>
                    <td className="px-4 py-3 font-semibold">{user.totalLogins}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
