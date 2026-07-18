import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";

const navItems = [
  { href: "/pinyin", label: "Pinyin" },
  { href: "/vocabulary", label: "Từ vựng" },
  { href: "/writing", label: "Tập viết" },
  { href: "/learn", label: "Ngữ pháp" },
  { href: "/speaking", label: "Luyện nói" },
  { href: "/courses", label: "Bài học" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-stone-300 bg-white">
      <nav className="mx-auto flex min-h-12 max-w-[1040px] items-center justify-between gap-4 px-5 py-2 text-sm sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-serif text-lg font-semibold text-orange-600">汉语学堂</span>
          <span className="hidden text-slate-500 sm:inline">Học tiếng Trung</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          {navItems.map((item) => (
            <Link className="hidden hover:text-orange-600 sm:inline" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                className="hidden rounded-md border border-stone-300 bg-[#fffdf5] px-3 py-2 shadow-sm hover:bg-stone-50 sm:block"
                href="/dashboard"
                title={user.email}
              >
                <span className="block max-w-32 truncate font-semibold">{user.name}</span>
                <span className="block max-w-32 truncate text-xs text-slate-500">{user.email}</span>
              </Link>
              <Link
                className="rounded-md border border-stone-300 bg-white px-3 py-2 font-semibold shadow-sm hover:bg-stone-50 sm:hidden"
                href="/dashboard"
              >
                Tài khoản
              </Link>
              <form action={logoutAction}>
                <button className="rounded-md border border-stone-300 bg-white px-3 py-2 font-semibold shadow-sm hover:bg-stone-50">
                  Đăng xuất
                </button>
              </form>
            </div>
          ) : (
            <Link
              className="rounded-md border border-stone-300 bg-white px-4 py-2 font-semibold shadow-sm hover:bg-stone-50"
              href="/login"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
