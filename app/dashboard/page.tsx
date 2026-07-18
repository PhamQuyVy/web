import Link from "next/link";
import { ProgressChart } from "@/components/progress/progress-chart";
import { SiteHeader } from "@/components/layout/site-header";
import { requireUser } from "@/lib/auth";
import { getLessons, getUserProgress, getVocabulary } from "@/lib/db";

export const dynamic = "force-dynamic";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildWeeklyData(dates: string[]) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dateKey(date);

    return {
      label: date.toLocaleDateString("vi", { weekday: "short" }),
      count: dates.filter((value) => value.startsWith(key)).length,
    };
  });
}

function calculateStreak(dates: string[]) {
  const completedDays = new Set(dates.map((value) => value.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();

  while (completedDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getActivityLabel(activityId: string) {
  const id = activityId.replace(/^activity:/, "");

  if (id.startsWith("vocabulary:")) {
    return "Luyện từ vựng";
  }
  if (id.startsWith("listen:word:")) {
    return "Nghe từ";
  }
  if (id.startsWith("listen:sentence:")) {
    return "Nghe câu";
  }
  if (id.startsWith("writing:")) {
    return "Tập viết chữ";
  }
  if (id.startsWith("pinyin:")) {
    return "Luyện pinyin";
  }
  if (id.startsWith("speaking:")) {
    return "Luyện nói";
  }
  if (id.startsWith("lesson:")) {
    return "Mở bài học";
  }
  if (id === "grammar") {
    return "Học ngữ pháp";
  }
  if (id === "vocabulary") {
    return "Mở kho từ vựng";
  }
  if (id === "writing") {
    return "Mở tập viết";
  }
  if (id === "speaking") {
    return "Mở luyện nói";
  }
  if (id === "pinyin") {
    return "Mở pinyin";
  }

  return "Hoạt động học";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [lessons, vocabulary, progress] = await Promise.all([getLessons(), getVocabulary(), getUserProgress(user.id)]);
  const activityEntries = Object.entries(progress.lessonCompletions).filter(([key]) => key.startsWith("activity:"));
  const learnedLessonIds = new Set(progress.completedLessonIds);
  const learnedVocabularyIds = new Set<string>();
  const practicedVocabularyIds = new Set<string>();
  const heardWordIds = new Set<string>();
  const heardSentenceIds = new Set<string>();
  const writtenWordIds = new Set<string>();
  const learnedModules = new Set<string>();

  activityEntries.forEach(([activityId]) => {
    const id = activityId.replace(/^activity:/, "");
    if (id.startsWith("listen:word:")) {
      heardWordIds.add(id.replace(/^listen:word:/, ""));
    }
    if (id.startsWith("listen:sentence:")) {
      heardSentenceIds.add(id.replace(/^listen:sentence:/, ""));
    }
    if (id.startsWith("lesson:")) {
      learnedLessonIds.add(id.replace(/^lesson:/, ""));
    }
    if (id.startsWith("vocabulary:")) {
      const vocabularyId = id.replace(/^vocabulary:/, "");
      learnedVocabularyIds.add(vocabularyId);
      practicedVocabularyIds.add(vocabularyId);
      learnedModules.add("vocabulary");
    }
    if (id.startsWith("writing:")) {
      const vocabularyId = id.replace(/^writing:/, "");
      learnedVocabularyIds.add(vocabularyId);
      writtenWordIds.add(vocabularyId);
      learnedModules.add("writing");
    }
    if (id.startsWith("pinyin")) {
      learnedModules.add("pinyin");
    }
    if (id.startsWith("speaking")) {
      learnedModules.add("speaking");
    }
    if (["grammar", "vocabulary", "writing", "speaking", "pinyin"].includes(id)) {
      learnedModules.add(id);
    }
  });

  const activityDates = [
    ...Object.values(progress.lessonCompletions),
    ...progress.quizAttempts.map((attempt) => attempt.completedAt),
  ];
  const learnedQuizLessonIds = new Set(progress.quizAttempts.map((attempt) => attempt.lessonId));
  const totalTrackableUnits = lessons.length + vocabulary.length * 3 + 5 + lessons.length;
  const learnedUnits =
    learnedLessonIds.size +
    practicedVocabularyIds.size +
    heardWordIds.size +
    heardSentenceIds.size +
    writtenWordIds.size +
    learnedModules.size +
    learnedQuizLessonIds.size;
  const totalDoneActivities = activityEntries.length + progress.quizAttempts.length;
  const completionPercent = Math.min(100, Math.round((learnedUnits / Math.max(totalTrackableUnits, 1)) * 100));
  const streak = calculateStreak(activityDates);
  const weeklyData = buildWeeklyData(activityDates);
  const recentActivities = [
    ...activityEntries.map(([activityId, completedAt]) => ({
      id: activityId,
      title: getActivityLabel(activityId),
      detail: activityId.replace(/^activity:/, ""),
      completedAt,
    })),
    ...progress.quizAttempts.map((attempt) => ({
      id: `quiz:${attempt.lessonId}:${attempt.completedAt}`,
      title: "Làm quiz",
      detail: `${attempt.correct}/${attempt.total} đúng`,
      completedAt: attempt.completedAt,
    })),
  ]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 6);
  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />
      <section className="mx-auto max-w-[1040px] px-5 py-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold">Tiến độ học tập</h1>
            <p className="mt-2 text-sm text-slate-600">
              Theo dõi từ đã luyện, mục đã học, quiz và thói quen học tiếng Trung của bạn.
            </p>
          </div>

          <aside className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Tài khoản</p>
            <p className="mt-2 truncate text-lg font-semibold">{user.name}</p>
            <p className="mt-1 truncate text-sm text-slate-600">{user.email}</p>
            <Link
              className="mt-4 inline-flex h-10 items-center rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold hover:bg-stone-50"
              href="/admin/users"
            >
              Quản lý người dùng
            </Link>
          </aside>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Tiến độ tổng</p>
            <p className="mt-2 text-3xl font-bold">{completionPercent}%</p>
            <p className="mt-1 text-xs text-slate-500">
              {totalDoneActivities} hoạt động đã ghi nhận
            </p>
          </div>
          <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Từ đã luyện</p>
            <p className="mt-2 text-3xl font-bold">{practicedVocabularyIds.size}</p>
            <p className="mt-1 text-xs text-slate-500">Flashcard và mở card từ vựng</p>
          </div>
          <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Từ đã nghe</p>
            <p className="mt-2 text-3xl font-bold">{heardWordIds.size}</p>
            <p className="mt-1 text-xs text-slate-500">Từ vựng, pinyin, âm mẫu</p>
          </div>
          <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Câu đã nghe</p>
            <p className="mt-2 text-3xl font-bold">{heardSentenceIds.size}</p>
            <p className="mt-1 text-xs text-slate-500">Hội thoại, bài đọc, câu mẫu</p>
          </div>
          <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Từ đã viết</p>
            <p className="mt-2 text-3xl font-bold">{writtenWordIds.size}</p>
            <p className="mt-1 text-xs text-slate-500">Tính khi mở/chấm phần tập viết</p>
          </div>
          <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Streak</p>
            <p className="mt-2 text-3xl font-bold">{streak} ngày</p>
            <p className="mt-1 text-xs text-slate-500">Tính theo ngày có hoạt động</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Hoạt động 7 ngày</h2>
            <ProgressChart data={weeklyData} />
          </section>

          <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Hoạt động gần đây</h2>
            <div className="mt-4 space-y-3">
              {recentActivities.length ? (
                recentActivities.map((activity) => (
                  <div className="rounded-md border border-stone-200 bg-[#fffdf5] p-3" key={activity.id}>
                    <p className="text-sm font-semibold">{activity.title}</p>
                    <p className="mt-1 break-all text-sm text-slate-600">{activity.detail}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">Chưa có hoạt động học nào.</p>
              )}
            </div>
          </section>
        </div>

      </section>
    </main>
  );
}
