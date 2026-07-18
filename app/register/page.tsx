import Image from "next/image";
import { redirect } from "next/navigation";
import { RegisterForms } from "@/components/auth/register-forms";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f7f3] text-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(#e7dfd2_1px,transparent_1px),linear-gradient(90deg,#e7dfd2_1px,transparent_1px)] bg-[size:42px_42px] opacity-45" />
      <div className="absolute left-8 top-10 hidden rotate-[-10deg] rounded-lg border border-sky-200 bg-white/80 px-8 py-4 font-serif text-7xl text-sky-200 shadow-sm md:block">
        字
      </div>
      <div className="absolute bottom-16 left-20 hidden rotate-6 rounded-lg border border-orange-200 bg-white/80 px-8 py-4 font-serif text-7xl text-orange-200 shadow-sm lg:block">
        写
      </div>
      <div className="absolute right-12 top-20 hidden rotate-12 rounded-lg border border-emerald-200 bg-white/80 px-8 py-4 font-serif text-7xl text-emerald-200 shadow-sm md:block">
        读
      </div>
      <div className="absolute bottom-20 right-32 hidden rotate-[-8deg] rounded-lg border border-rose-200 bg-white/80 px-8 py-4 font-serif text-7xl text-rose-200 shadow-sm xl:block">
        友
      </div>

      <section className="relative mx-auto grid min-h-screen max-w-[1080px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
            Tạo tài khoản học tiếng Trung của{" "}
            <span className="font-serif text-orange-600">QUÝ VỸ</span>
          </h1>
          <div className="mt-8 w-full max-w-[520px] overflow-hidden rounded-2xl border border-stone-300 bg-orange-50 shadow-sm">
            <Image
              alt="Mèo Miu chào mừng đăng kí"
              className="aspect-square w-full object-cover"
              height={760}
              loading="eager"
              src="/images/miu-cat.png"
              width={760}
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[420px]">
          <RegisterForms />
        </div>
      </section>
    </main>
  );
}
