import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { submitQuizAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { getLesson, getLessons, getUserProgress } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const lessons = await getLessons();
  return lessons.map((lesson) => ({ id: lesson.id }));
}

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const [{ id }, { done }, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const lesson = await getLesson(id);

  if (!lesson) {
    notFound();
  }

  const progress = user ? await getUserProgress(user.id) : null;
  const latestAttempt = progress?.quizAttempts.filter((attempt) => attempt.lessonId === lesson.id).at(-1);

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />
      <section className="mx-auto max-w-[840px] px-5 py-6">
        <Link className="text-sm font-semibold text-orange-700 hover:text-orange-800" href={`/lesson/${lesson.id}`}>
          ← Xem lại bài học
        </Link>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_260px]">
          <form action={submitQuizAction} className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <input name="lessonId" type="hidden" value={lesson.id} />
            <p className="text-sm font-medium uppercase text-slate-500">Quiz động từ DB</p>
            <h1 className="mt-2 text-3xl font-bold">{lesson.title}</h1>
            <div className="mt-6 space-y-5">
              {lesson.quiz.map((question, index) => (
                <fieldset key={question.id} className="rounded-lg border border-stone-300 p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-500">Câu {index + 1}</legend>
                  <p className="mt-2 font-semibold">{question.prompt}</p>
                  <div className="mt-4 grid gap-2">
                    {question.options.map((option) => (
                      <label key={option} className="flex items-center gap-3 rounded-md border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50">
                        <input required name={question.id} type="radio" value={option} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <button className="mt-6 rounded-md bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700">
              Nộp bài
            </button>
          </form>

          <aside className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Kết quả thật</h2>
            {!user ? (
              <div className="mt-4 rounded-md bg-orange-50 p-4 text-sm text-orange-800">
                Đăng nhập trước khi nộp bài để lưu kết quả vào progress.
              </div>
            ) : done && latestAttempt ? (
              <div className="mt-4 rounded-md bg-emerald-50 p-4 text-emerald-900">
                <p className="text-3xl font-bold">
                  {latestAttempt.correct}/{latestAttempt.total}
                </p>
                <p className="mt-1 text-sm">Đã lưu vào DB progress.</p>
              </div>
            ) : latestAttempt ? (
              <p className="mt-4 text-sm text-slate-600">
                Lần gần nhất: {latestAttempt.correct}/{latestAttempt.total} đúng.
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-600">Chưa có lần làm quiz nào cho bài này.</p>
            )}
            <Link className="mt-5 block rounded-md border border-stone-300 bg-white px-4 py-2 text-center text-sm font-semibold hover:bg-stone-50" href="/dashboard">
              Xem dashboard
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
