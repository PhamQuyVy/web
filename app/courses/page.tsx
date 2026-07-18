import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { getLessons } from "@/lib/db";
import type { Lesson } from "@/lib/types";

function groupLessons(lessons: Lesson[]) {
  return lessons.reduce<Record<string, Lesson[]>>((groups, lesson) => {
    const key = lesson.level;
    groups[key] = groups[key] ?? [];
    groups[key].push(lesson);
    return groups;
  }, {});
}

function getLevelOrder(level: string) {
  const match = level.match(/HSK\s*(\d+)/);

  if (match) {
    return Number(match[1]);
  }

  return 99;
}

export default async function CoursesPage() {
  const lessons = await getLessons();
  const groups = groupLessons(lessons);
  const sortedGroups = Object.entries(groups).sort(([levelA], [levelB]) => {
    const orderA = getLevelOrder(levelA);
    const orderB = getLevelOrder(levelB);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return levelA.localeCompare(levelB, "vi");
  });
  const quizCount = lessons.reduce((total, lesson) => total + lesson.quiz.length, 0);
  const totalMinutes = lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0);

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />
      <section className="mx-auto max-w-[900px] px-5 py-6">
        <Link className="text-sm font-semibold text-orange-700 hover:text-orange-800" href="/">
          ← Về trang chủ
        </Link>
        <div className="mt-4 rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Kho bài học</p>
          <h1 className="mt-2 text-3xl font-bold">Học tiếng Trung theo chủ đề</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            Chọn bài theo trình độ hoặc kỹ năng. Mỗi bài có nội dung học, từ vựng liên quan và quiz riêng.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Bài học", value: `${lessons.length}` },
              { label: "Câu quiz", value: `${quizCount}` },
              { label: "Thời lượng", value: `${totalMinutes} phút` },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
                <p className="text-xs uppercase text-slate-500">{item.label}</p>
                <p className="mt-1 text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-5 pb-10">
        <div className="space-y-6">
          {sortedGroups.map(([level, items]) => (
            <div key={level}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{level}</h2>
                <span className="text-sm text-slate-500">{items.length} bài</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((lesson) => (
                  <article key={lesson.id} className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                        {lesson.level}
                      </span>
                      <span className="text-xs text-slate-500">{lesson.durationMinutes} phút</span>
                    </div>
                    <h3 className="mt-4 font-semibold">{lesson.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{lesson.subtitle}</p>
                    <p className="mt-3 min-h-16 text-sm leading-6 text-slate-700">{lesson.summary}</p>
                    <div className="mt-5 flex gap-2">
                      <Link className="rounded-md border border-slate-900 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50" href={`/lesson/${lesson.id}`}>
                        Học
                      </Link>
                      <Link className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-stone-50" href={`/quiz/${lesson.id}`}>
                        Quiz
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
