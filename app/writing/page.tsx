import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { WritingPad } from "@/components/practice/writing-pad";
import { WritingCharacterLibrary, type WritingPracticeItem } from "@/components/practice/writing-character-library";
import { getCurrentUser } from "@/lib/auth";
import { getVocabulary, recordStudyActivity } from "@/lib/db";
import type { VocabularyItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const strokeRules = [
  {
    title: "Ngang trước, sổ sau",
    example: "十",
    steps: ["一", "十"],
    note: "Viết nét ngang trước rồi mới viết nét dọc.",
  },
  {
    title: "Phẩy trước, mác sau",
    example: "人",
    steps: ["丿", "人"],
    note: "Các chữ như 人, 八 cần giữ độ nghiêng tự nhiên của hai nét.",
  },
  {
    title: "Trên trước, dưới sau",
    example: "三",
    steps: ["一", "二", "三"],
    note: "Viết từ phần trên xuống phần dưới để chữ cân đối.",
  },
  {
    title: "Trái trước, phải sau",
    example: "你",
    steps: ["亻", "尔", "你"],
    note: "Với chữ có hai phần, viết bộ bên trái trước.",
  },
  {
    title: "Ngoài trước, trong sau",
    example: "问",
    steps: ["门", "口", "问"],
    note: "Khung ngoài viết trước, phần bên trong viết sau.",
  },
  {
    title: "Vào trước, đóng sau",
    example: "国",
    steps: ["囗", "玉", "国"],
    note: "Với khung kín, viết nét đóng cuối cùng sau khi xong phần trong.",
  },
];

const radicals = [
  { radical: "亻", name: "nhân đứng", meaning: "người", examples: ["你", "他", "们"] },
  { radical: "口", name: "khẩu", meaning: "miệng/nói", examples: ["吃", "喝", "叫"] },
  { radical: "氵", name: "ba chấm thủy", meaning: "nước", examples: ["汉", "洗", "河"] },
  { radical: "女", name: "nữ", meaning: "phụ nữ/người nữ", examples: ["妈", "姐", "妹"] },
  { radical: "木", name: "mộc", meaning: "cây/gỗ", examples: ["本", "林", "校"] },
  { radical: "日", name: "nhật", meaning: "mặt trời/ngày", examples: ["明", "时", "昨"] },
  { radical: "月", name: "nguyệt", meaning: "trăng/cơ thể", examples: ["朋", "服", "腿"] },
  { radical: "心", name: "tâm", meaning: "tim/cảm xúc", examples: ["想", "您", "忘"] },
];

const basicStrokes = [
  {
    name: "Ngang",
    stroke: "一",
    pinyin: "héng",
    direction: "Kéo từ trái sang phải, giữ nét thẳng và đều.",
    examples: ["一", "二", "三", "王"],
  },
  {
    name: "Sổ",
    stroke: "丨",
    pinyin: "shù",
    direction: "Kéo từ trên xuống dưới, thân nét đứng chắc.",
    examples: ["十", "中", "上", "下"],
  },
  {
    name: "Phẩy",
    stroke: "丿",
    pinyin: "piě",
    direction: "Kéo từ trên phải xuống dưới trái, cuối nét nhẹ dần.",
    examples: ["人", "八", "大", "你"],
  },
  {
    name: "Mác",
    stroke: "㇏",
    pinyin: "nà",
    direction: "Kéo từ trên trái xuống dưới phải, cuối nét mở tự nhiên.",
    examples: ["人", "大", "太", "木"],
  },
  {
    name: "Chấm",
    stroke: "丶",
    pinyin: "diǎn",
    direction: "Đặt bút ngắn, dứt khoát, không kéo quá dài.",
    examples: ["六", "主", "学", "京"],
  },
  {
    name: "Hất",
    stroke: "㇀",
    pinyin: "tí",
    direction: "Kéo từ dưới trái lên trên phải, nét nhỏ nhưng rõ lực.",
    examples: ["汉", "冷", "习", "江"],
  },
  {
    name: "Ngang gập",
    stroke: "𠃍",
    pinyin: "héng zhé",
    direction: "Kéo ngang rồi gập xuống, góc gập gọn.",
    examples: ["口", "日", "田", "回"],
  },
  {
    name: "Sổ móc",
    stroke: "亅",
    pinyin: "shù gōu",
    direction: "Kéo sổ xuống rồi móc nhẹ sang trái.",
    examples: ["小", "水", "可", "丁"],
  },
  {
    name: "Cong móc",
    stroke: "乚",
    pinyin: "wān gōu",
    direction: "Đi cong rồi móc lên, giữ phần cong mềm.",
    examples: ["儿", "元", "见", "也"],
  },
  {
    name: "Xiên móc",
    stroke: "㇂",
    pinyin: "xié gōu",
    direction: "Kéo xiên xuống rồi móc, thường gặp trong chữ có 戈.",
    examples: ["我", "成", "或", "戈"],
  },
  {
    name: "Gập móc",
    stroke: "㇌",
    pinyin: "héng zhé gōu",
    direction: "Ngang, gập xuống rồi móc; đừng làm góc quá tròn.",
    examples: ["月", "用", "同", "问"],
  },
  {
    name: "Ngang phẩy",
    stroke: "㇇",
    pinyin: "héng piě",
    direction: "Kéo ngang ngắn rồi chuyển sang phẩy xuống trái.",
    examples: ["又", "友", "发", "饭"],
  },
];

const routine = [
  "Nhìn chữ mẫu 10 giây: xác định bộ thủ, trái/phải, trên/dưới.",
  "Đếm số nét và đọc pinyin trước khi viết.",
  "Viết chậm 3 lần theo đúng thứ tự nét.",
  "Che chữ mẫu và viết lại 2 lần từ trí nhớ.",
  "Đặt 1 câu ngắn với chữ đó để nhớ nghĩa.",
];

function buildWritingItems(vocabulary: VocabularyItem[]): WritingPracticeItem[] {
  return vocabulary.map((item) => ({
    id: item.id,
    hanzi: item.hanzi,
    pinyin: item.pinyin,
    meaning: item.meaning,
    hsk: item.hsk,
    topic: item.topic ?? "Tổng hợp",
    example: item.example,
    exampleMeaning: item.exampleMeaning,
  })).sort((a, b) => {
    if (a.hsk !== b.hsk) {
      return a.hsk - b.hsk;
    }

    return a.id.localeCompare(b.id);
  });
}

export default async function WritingPage() {
  const [vocabulary, user] = await Promise.all([getVocabulary(), getCurrentUser()]);
  if (user) {
    await recordStudyActivity(user.id, "writing");
  }

  const writingItems = buildWritingItems(vocabulary);

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />

      <section className="mx-auto max-w-[960px] px-5 py-6">
        <Link className="text-sm font-semibold text-orange-700 hover:text-orange-800" href="/">
          ← Về trang chủ
        </Link>
        <div className="mt-4 rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Tập viết chữ Hán</p>
          <h1 className="mt-2 text-3xl font-bold">Viết đúng nét trước khi học nhiều chữ</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            Người mới nên nắm quy tắc nét, bộ thủ và cách chia bố cục chữ. Viết chậm, đúng thứ tự, rồi mới tăng số lượng chữ.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Quy tắc nét</p>
              <p className="mt-1 text-lg font-semibold">{strokeRules.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Bộ thủ đầu tiên</p>
              <p className="mt-1 text-lg font-semibold">{radicals.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Chữ từ vựng</p>
              <p className="mt-1 text-lg font-semibold">{writingItems.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Kho luyện viết</p>
          <h2 className="text-xl font-semibold">Chữ Hán từ dễ tới khó theo từ vựng</h2>
        </div>
        <WritingCharacterLibrary items={writingItems} />
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Quy trình mỗi chữ</p>
          <h2 className="text-xl font-semibold">5 bước tập viết không bị học vẹt</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {routine.map((item, index) => (
            <article className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm" key={item}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-sm font-semibold text-orange-700">
                {index + 1}
              </span>
              <p className="mt-3 text-sm leading-6 text-slate-700">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Luyện nét cơ bản</p>
          <h2 className="text-xl font-semibold">12 nét bắt buộc phải nhớ trước khi viết chữ Hán</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {basicStrokes.map((item) => (
            <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm" key={item.name}>
              <div className="flex items-start gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-orange-100 bg-orange-50 font-serif text-5xl font-semibold text-orange-600">
                  {item.stroke}
                </span>
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.pinyin}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.direction}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.examples.map((example) => (
                  <span className="rounded border border-stone-300 bg-[#fffdf5] px-3 py-2 font-serif text-2xl" key={`${item.name}-${example}`}>
                    {example}
                  </span>
                ))}
              </div>
              <div className="mt-4 border-t border-stone-200 pt-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Luyện viết nét {item.name}</p>
                <WritingPad compact hanzi={item.stroke} meaning={item.direction} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Thứ tự nét</p>
          <h2 className="text-xl font-semibold">Các quy tắc viết cơ bản</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {strokeRules.map((rule) => (
            <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm" key={rule.title}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{rule.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{rule.note}</p>
                </div>
                <span className="font-serif text-5xl font-semibold text-orange-600">{rule.example}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {rule.steps.map((step, index) => (
                  <span className="rounded-md border border-stone-300 bg-[#fffdf5] px-3 py-2 font-serif text-2xl" key={`${rule.title}-${step}-${index}`}>
                    {step}
                  </span>
                ))}
              </div>
              <div className="mt-4 border-t border-stone-200 pt-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Luyện viết theo quy tắc này</p>
                <WritingPad compact hanzi={rule.example} meaning={rule.note} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Bộ thủ</p>
          <h2 className="text-xl font-semibold">8 bộ thủ nên biết sớm</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {radicals.map((item) => (
            <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm" key={item.radical}>
              <p className="font-serif text-5xl font-semibold text-orange-600">{item.radical}</p>
              <h3 className="mt-3 font-semibold">{item.name}</h3>
              <p className="mt-1 text-sm text-slate-600">Gợi nghĩa: {item.meaning}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.examples.map((example) => (
                  <span className="rounded border border-stone-300 bg-[#fffdf5] px-3 py-2 font-serif text-2xl" key={example}>
                    {example}
                  </span>
                ))}
              </div>
              <div className="mt-4 border-t border-stone-200 pt-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Luyện viết bộ {item.name}</p>
                <WritingPad compact hanzi={item.radical} meaning={item.meaning} />
              </div>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
