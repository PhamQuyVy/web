import Link from "next/link";
import { GrammarPatternBrowser } from "@/components/learning/grammar-pattern-browser";
import { SentenceBuilder } from "@/components/learning/sentence-builder";
import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentUser } from "@/lib/auth";
import { getLessons, getLibraryData, getVocabulary, recordStudyActivity } from "@/lib/db";
import { buildSentenceDrillsFromGrammar } from "@/lib/learning/grammar-drill-generator";

export const dynamic = "force-dynamic";

const hskFocus = [
  {
    level: 1,
    title: "HSK 1 - Nền tảng",
    goal: "Nghe, đọc và nói câu rất ngắn trong đời sống hằng ngày.",
    focus: ["Pinyin và thanh điệu", "Số đếm, thời gian", "Câu 是, 有, 在", "Hỏi đáp bằng 吗"],
  },
  {
    level: 2,
    title: "HSK 2 - Sinh hoạt",
    goal: "Nói rõ nhu cầu cơ bản: mua đồ, hỏi đường, học tập, lịch trình.",
    focus: ["了, 过, 着", "Bổ ngữ mức độ", "So sánh 比", "Câu hỏi lựa chọn"],
  },
  {
    level: 3,
    title: "HSK 3 - Giao tiếp mở rộng",
    goal: "Kể việc đã xảy ra, nói lý do, miêu tả người và tình huống.",
    focus: ["把 / 被 cơ bản", "因为...所以", "虽然...但是", "Bổ ngữ kết quả"],
  },
  {
    level: 4,
    title: "HSK 4 - Trung cấp",
    goal: "Đọc đoạn dài hơn, nói ý kiến và nối câu tự nhiên hơn.",
    focus: ["Câu phức", "Bổ ngữ xu hướng", "Câu bị động", "Cách nhấn mạnh"],
  },
  {
    level: 5,
    title: "HSK 5 - Diễn đạt sâu",
    goal: "Hiểu văn bản dài, phân biệt sắc thái từ và viết đoạn ngắn.",
    focus: ["Liên kết đoạn", "Từ trừu tượng", "Cấu trúc văn viết", "Sắc thái ngữ khí"],
  },
  {
    level: 6,
    title: "HSK 6 - Nâng cao",
    goal: "Đọc hiểu, lập luận và diễn đạt linh hoạt như người học nâng cao.",
    focus: ["Lập luận dài", "Thành ngữ thường gặp", "Từ học thuật", "Tóm tắt và phản biện"],
  },
];

function matchesHskLevel(label: string, level: number) {
  return new RegExp(`^HSK ${level}(?:$|\\+|-|\\s)`).test(label);
}

export default async function LearnPage() {
  const [{ grammarPatterns }, lessons, vocabulary, user] = await Promise.all([
    getLibraryData(),
    getLessons(),
    getVocabulary(),
    getCurrentUser(),
  ]);

  if (user) {
    await recordStudyActivity(user.id, "grammar");
  }

  const sentenceDrills = buildSentenceDrillsFromGrammar(grammarPatterns);
  const hskRoadmap = hskFocus.map((item) => {
    const grammarCount = grammarPatterns.filter((pattern) => matchesHskLevel(pattern.level, item.level)).length;
    const lessonCount = lessons.filter((lesson) => matchesHskLevel(lesson.level, item.level)).length;
    const vocabularyCount = vocabulary.filter((word) => word.hsk === item.level).length;

    return {
      ...item,
      grammarCount,
      lessonCount,
      vocabularyCount,
    };
  });

  const totalLessons = hskRoadmap.reduce((sum, item) => sum + item.lessonCount, 0);
  const totalVocabulary = hskRoadmap.reduce((sum, item) => sum + item.vocabularyCount, 0);

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />
      <section className="mx-auto max-w-[980px] px-5 py-6">
        <Link className="text-sm font-semibold text-orange-700 hover:text-orange-800" href="/">
          ← Về trang chủ
        </Link>
        <div className="mt-4 rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Kiến thức HSK 1-6</p>
          <h1 className="mt-2 text-3xl font-bold">Học tiếng Trung từ nền tảng đến nâng cao</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            Lộ trình được chia theo HSK: học âm, từ vựng, mẫu câu, bài học và bài ghép câu theo đúng cấp độ.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Từ vựng HSK</p>
              <p className="mt-1 text-lg font-semibold">{totalVocabulary}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Bài học</p>
              <p className="mt-1 text-lg font-semibold">{totalLessons}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Mẫu ngữ pháp</p>
              <p className="mt-1 text-lg font-semibold">{grammarPatterns.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[980px] px-5 pb-8">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Lộ trình</p>
            <h2 className="text-xl font-semibold">Tối ưu kiến thức tới HSK 6</h2>
          </div>
          <div className="flex gap-2">
            <Link className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-stone-50" href="/courses">
              Bài học
            </Link>
            <Link className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-stone-50" href="/vocabulary">
              Từ vựng
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {hskRoadmap.map((item) => (
            <article key={item.level} className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">HSK {item.level}</p>
                  <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  {item.vocabularyCount} từ
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item.goal}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.focus.map((focus) => (
                  <span key={focus} className="rounded-full border border-stone-200 bg-[#fffdf5] px-3 py-1 text-xs font-medium text-slate-700">
                    {focus}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-3 py-2">
                  <p className="text-xs uppercase text-slate-500">Bài học</p>
                  <p className="font-semibold">{item.lessonCount}</p>
                </div>
                <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-3 py-2">
                  <p className="text-xs uppercase text-slate-500">Ngữ pháp</p>
                  <p className="font-semibold">{item.grammarCount}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[980px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Ghép câu</p>
          <h2 className="text-xl font-semibold">Sắp xếp từ đúng theo mẫu ngữ pháp</h2>
        </div>
        <SentenceBuilder drills={sentenceDrills} />
      </section>

      <section className="mx-auto max-w-[980px] px-5 pb-10">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Mẫu câu</p>
          <h2 className="text-xl font-semibold">Kho ngữ pháp cốt lõi, ngắn gọn</h2>
        </div>
        <GrammarPatternBrowser patterns={grammarPatterns} />
      </section>
    </main>
  );
}
