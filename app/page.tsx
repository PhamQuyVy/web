import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SpeakButton } from "@/components/practice/speak-button";
import { getCurrentUser } from "@/lib/auth";
import { getHomeData } from "@/lib/db";

const learningFlow = [
  {
    title: "1. Pinyin",
    text: "Nghe âm, đọc theo và nắm thanh điệu trước khi học chữ.",
    href: "/pinyin",
  },
  {
    title: "2. Từ vựng",
    text: "Học từ theo HSK và chủ đề, dùng flashcard để nhớ mặt chữ.",
    href: "/vocabulary",
  },
  {
    title: "3. Tập viết",
    text: "Luyện nét, bộ thủ và viết trực tiếp trên web.",
    href: "/writing",
  },
  {
    title: "4. Ngữ pháp",
    text: "Học mẫu câu ngắn gọn, rồi ghép câu để nhớ cách dùng.",
    href: "/learn",
  },
  {
    title: "5. Luyện nói",
    text: "Nghe từng câu hội thoại, đọc theo và kiểm tra câu máy nhận diện được.",
    href: "/speaking",
  },
  {
    title: "6. Bài học",
    text: "Vào bài theo HSK để học đủ nội dung và làm quiz theo bài.",
    href: "/courses",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/intro");
  }

  const { todayVocabulary } = await getHomeData();

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />

      <section className="border-b border-stone-300 bg-white">
        <div className="mx-auto grid max-w-[960px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_260px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">Chào mừng quay lại</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-normal">
              Web học tiếng Trung của
              <br />
              <span className="font-serif text-orange-600">QUÝ VỸ</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-700">
              Bắt đầu từ âm, từ, nét chữ, ngữ pháp rồi luyện nghe nói theo từng cấp HSK.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-md bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700" href="/pinyin">
                Bắt đầu học
              </Link>
              <Link className="rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-stone-50" href="/dashboard">
                Xem tiến độ
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[260px] rounded-lg border border-stone-300 bg-[#f8f7f3] px-6 py-7 shadow-sm">
            <div className="mx-auto w-fit rounded-full border border-stone-300 bg-[#fff7ed] p-3 shadow-inner">
              <Image
                alt="Mèo Miu đồng hành học tiếng Trung"
                className="h-32 w-32 rounded-full object-cover"
                height={320}
                loading="eager"
                src="/images/miu-cat.png"
                width={320}
              />
            </div>
            <div className="mt-6 border-t border-stone-300 pt-5 text-center">
              <p className="font-serif text-2xl font-semibold text-orange-700">汉语学堂</p>
              <p className="mt-1 text-sm text-slate-600">写 · 听 · 说 · 读</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 py-6">
        <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <span className="font-serif text-6xl font-semibold text-orange-600">{todayVocabulary.hanzi}</span>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Từ hôm nay</p>
                <p className="text-sm text-slate-600">{todayVocabulary.pinyin}</p>
                <p className="text-2xl font-semibold">{todayVocabulary.meaning}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <SpeakButton activityId={`listen:word:${todayVocabulary.id}`} label="Nghe từ" text={todayVocabulary.hanzi} />
              <Link className="rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-stone-50" href="/vocabulary">
                Mở flashcard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-10">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Luồng học</p>
          <h2 className="text-xl font-semibold">Học theo thứ tự để không bị rối</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {learningFlow.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-500 hover:shadow-md">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
