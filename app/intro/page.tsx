import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function IntroPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f7f3] text-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(#e7dfd2_1px,transparent_1px),linear-gradient(90deg,#e7dfd2_1px,transparent_1px)] bg-[size:42px_42px] opacity-45" />
      <div className="pointer-events-none absolute inset-x-0 top-28 hidden justify-center gap-5 font-serif text-4xl text-stone-300/55 md:flex">
        {["学", "写", "读", "听", "说", "汉", "语", "词", "句", "声"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-28 hidden justify-center gap-5 font-serif text-4xl text-stone-300/55 md:flex">
        {["你", "好", "我", "们", "中", "文", "老", "师", "朋", "友"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="absolute left-8 top-8 hidden rotate-[-10deg] rounded-lg border border-orange-200 bg-white/70 px-5 py-3 font-serif text-5xl text-orange-200 shadow-sm md:block">
        你
      </div>
      <div className="absolute left-36 top-32 hidden rotate-6 rounded-lg border border-rose-200 bg-white/70 px-5 py-3 font-serif text-5xl text-rose-200 shadow-sm xl:block">
        爱
      </div>
      <div className="absolute bottom-16 left-20 hidden rotate-6 rounded-lg border border-emerald-200 bg-white/70 px-5 py-3 font-serif text-5xl text-emerald-200 shadow-sm lg:block">
        学
      </div>
      <div className="absolute bottom-36 left-1/3 hidden rotate-[-7deg] rounded-lg border border-amber-200 bg-white/70 px-5 py-3 font-serif text-5xl text-amber-200 shadow-sm xl:block">
        书
      </div>
      <div className="absolute right-10 top-12 hidden rotate-12 rounded-lg border border-sky-200 bg-white/70 px-5 py-3 font-serif text-5xl text-sky-200 shadow-sm md:block">
        文
      </div>
      <div className="absolute right-28 bottom-20 hidden rotate-[-8deg] rounded-lg border border-violet-200 bg-white/70 px-5 py-3 font-serif text-5xl text-violet-200 shadow-sm lg:block">
        友
      </div>

      <section className="relative mx-auto grid min-h-screen max-w-[980px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_380px] lg:items-center">
        <div>
          <div className="mb-6 flex flex-wrap gap-2">
            {["nǐ hǎo", "hàn yǔ", "xué xí", "zhōng wén", "pīn yīn"].map((item) => (
              <span className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm" key={item}>
                {item}
              </span>
            ))}
          </div>
          <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-normal sm:text-6xl">
            Chào mừng đến với trang học tiếng Trung của <span className="font-serif text-orange-600">QUÝ VỸ</span>
          </h1>
          <Link className="mt-8 inline-block rounded-md bg-orange-600 px-7 py-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(234,88,12,0.25)] transition hover:-translate-y-0.5 hover:bg-orange-700" href="/login">
            Đăng nhập
          </Link>
        </div>

        <div className="mx-auto w-full max-w-[380px]">
          <div className="relative">
            <div className="absolute -right-4 -top-4 h-full w-full rounded-xl border border-orange-200 bg-orange-100" />
            <div className="absolute -bottom-4 -left-4 h-full w-full rounded-xl border border-emerald-200 bg-emerald-50" />
            <div className="relative overflow-hidden rounded-xl border border-stone-300 bg-orange-50 shadow-lg">
              <Image
                alt="Mèo Miu"
                className="aspect-square w-full object-cover"
                height={520}
                loading="eager"
                src="/images/miu-cat.png"
                width={520}
              />
            </div>
            <span className="absolute -bottom-5 right-6 rounded-full border border-stone-300 bg-white px-4 py-2 font-serif text-2xl font-semibold text-orange-600 shadow-sm">
              喵
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
