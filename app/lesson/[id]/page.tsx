import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SpeakButton } from "@/components/practice/speak-button";
import { completeLessonAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { getLesson, getLessons, getUserProgress, getVocabularyByIds, recordStudyActivity } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const lessons = await getLessons();
  return lessons.map((lesson) => ({ id: lesson.id }));
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lesson, user] = await Promise.all([getLesson(id), getCurrentUser()]);

  if (!lesson) {
    notFound();
  }

  if (user) {
    await recordStudyActivity(user.id, `lesson:${lesson.id}`);
  }

  const [vocabulary, progress] = await Promise.all([
    getVocabularyByIds(lesson.vocabularyIds),
    user ? getUserProgress(user.id) : Promise.resolve(null),
  ]);
  const isDone = progress?.completedLessonIds.includes(lesson.id) ?? false;

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />
      <section className="mx-auto max-w-[840px] px-5 py-6">
        <Link className="text-sm font-semibold text-orange-700 hover:text-orange-800" href="/">
          ← Về trang chủ
        </Link>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_280px]">
          <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase text-slate-500">
              {lesson.level} · {lesson.durationMinutes} phút
            </p>
            <h1 className="mt-2 text-3xl font-bold">{lesson.title}</h1>
            <p className="mt-2 text-slate-600">{lesson.subtitle}</p>
            <p className="mt-4 leading-7 text-slate-700">{lesson.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SpeakButton
                activityId={`listen:sentence:lesson:${lesson.id}`}
                label="Nghe từ vựng"
                text={vocabulary.map((item) => `${item.hanzi}。${item.example}`).join(" ")}
              />
            </div>

            <div className="mt-6 space-y-4">
              {lesson.sections.map((section) => (
                <section key={section.title} className="rounded-lg border border-stone-200 bg-[#fffdf5] p-4">
                  <h2 className="font-semibold">{section.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{section.body}</p>
                </section>
              ))}
            </div>

            <form action={completeLessonAction} className="mt-6">
              <input name="lessonId" type="hidden" value={lesson.id} />
              <button className="rounded-md border border-slate-900 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50">
                {isDone ? "Học lại và làm quiz" : "Đánh dấu đã học"}
              </button>
            </form>
          </article>

          <aside className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Từ vựng trong bài</h2>
            <div className="mt-4 space-y-4">
              {vocabulary.map((item) => (
                <div key={item.id} className="border-b border-stone-200 pb-3 last:border-0 last:pb-0">
                  <p className="font-serif text-3xl text-orange-600">{item.hanzi}</p>
                  <p className="text-sm text-slate-500">{item.pinyin}</p>
                  <p className="font-semibold">{item.meaning}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.example}</p>
                  <SpeakButton activityId={`listen:word:${item.id}`} className="mt-3" label="Nghe" text={item.hanzi} />
                </div>
              ))}
            </div>
            <Link className="mt-5 block rounded-md border border-stone-300 bg-white px-4 py-2 text-center text-sm font-semibold hover:bg-stone-50" href={`/quiz/${lesson.id}`}>
              Làm quiz bài này
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
