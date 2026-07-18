import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { VocabularyBrowser } from "@/components/practice/vocabulary-browser";
import { VocabularyFlashcards } from "@/components/practice/vocabulary-flashcards";
import { getCurrentUser } from "@/lib/auth";
import { getVocabulary, recordStudyActivity } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const [vocabulary, user] = await Promise.all([getVocabulary(), getCurrentUser()]);
  if (user) {
    await recordStudyActivity(user.id, "vocabulary");
  }
  const topicCount = new Set(vocabulary.map((item) => item.topic ?? "Khác")).size;

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />
      <section className="mx-auto max-w-[960px] px-5 py-6">
        <Link className="text-sm font-semibold text-orange-700 hover:text-orange-800" href="/">
          ← Về trang chủ
        </Link>
        <div className="mt-4 rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Kho từ vựng</p>
          <h1 className="mt-2 text-3xl font-bold">Từ vựng tiếng Trung HSK và giao tiếp</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            Danh sách từ/cụm thông dụng có chữ Hán, pinyin, nghĩa, ví dụ và giọng đọc để luyện nhận diện, nghe và đặt câu.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Tổng số từ</p>
              <p className="mt-1 text-lg font-semibold">{vocabulary.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Chủ đề</p>
              <p className="mt-1 text-lg font-semibold">{topicCount} nhóm</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <VocabularyFlashcards vocabulary={vocabulary} />
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-10">
        <VocabularyBrowser vocabulary={vocabulary} />
      </section>
    </main>
  );
}
