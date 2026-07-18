import Link from "next/link";
import { PinyinPractice } from "@/components/practice/pinyin-practice";
import { PinyinSoundCard } from "@/components/practice/pinyin-sound-card";
import { SiteHeader } from "@/components/layout/site-header";
import { SpeakButton } from "@/components/practice/speak-button";
import { getCurrentUser } from "@/lib/auth";
import { recordStudyActivity } from "@/lib/db";

export const dynamic = "force-dynamic";

const initials = [
  { group: "Hai môi", items: ["b", "p", "m", "f"], tip: "b/p khác nhau ở hơi bật ra; p bật hơi mạnh hơn." },
  { group: "Đầu lưỡi", items: ["d", "t", "n", "l"], tip: "d/t đặt đầu lưỡi sau răng trên; t bật hơi rõ." },
  { group: "Gốc lưỡi", items: ["g", "k", "h"], tip: "g/k phát ở cuống lưỡi; k có hơi bật mạnh." },
  { group: "Mặt lưỡi", items: ["j", "q", "x"], tip: "Đọc với miệng hơi bè; không đọc như gi/q/x tiếng Việt." },
  { group: "Đầu lưỡi cong", items: ["zh", "ch", "sh", "r"], tip: "Cong đầu lưỡi nhẹ lên vòm miệng; ch bật hơi hơn zh." },
  { group: "Đầu lưỡi phẳng", items: ["z", "c", "s"], tip: "Giữ lưỡi phẳng gần răng; c bật hơi mạnh hơn z." },
];

const finals = [
  { group: "Âm đơn", items: ["a", "o", "e", "i", "u", "ü"] },
  { group: "Âm đôi", items: ["ai", "ei", "ao", "ou", "ia", "ie", "ua", "uo", "üe"] },
  { group: "Âm mũi trước", items: ["an", "en", "in", "un", "ün", "ian", "uan"] },
  { group: "Âm mũi sau", items: ["ang", "eng", "ing", "ong", "iang", "uang", "iong"] },
];

const soundSamples: Record<string, { hanzi: string; pinyin: string; meaning: string }> = {
  b: { hanzi: "波", pinyin: "bō", meaning: "sóng" },
  p: { hanzi: "坡", pinyin: "pō", meaning: "dốc" },
  m: { hanzi: "摸", pinyin: "mō", meaning: "sờ" },
  f: { hanzi: "佛", pinyin: "fó", meaning: "Phật" },
  d: { hanzi: "得", pinyin: "dé", meaning: "đạt được" },
  t: { hanzi: "特", pinyin: "tè", meaning: "đặc biệt" },
  n: { hanzi: "呢", pinyin: "ne", meaning: "trợ từ" },
  l: { hanzi: "了", pinyin: "le", meaning: "rồi" },
  g: { hanzi: "哥", pinyin: "gē", meaning: "anh trai" },
  k: { hanzi: "科", pinyin: "kē", meaning: "môn/ngành" },
  h: { hanzi: "喝", pinyin: "hē", meaning: "uống" },
  j: { hanzi: "鸡", pinyin: "jī", meaning: "gà" },
  q: { hanzi: "七", pinyin: "qī", meaning: "bảy" },
  x: { hanzi: "西", pinyin: "xī", meaning: "tây" },
  zh: { hanzi: "知", pinyin: "zhī", meaning: "biết" },
  ch: { hanzi: "吃", pinyin: "chī", meaning: "ăn" },
  sh: { hanzi: "师", pinyin: "shī", meaning: "thầy" },
  r: { hanzi: "日", pinyin: "rì", meaning: "ngày" },
  z: { hanzi: "资", pinyin: "zī", meaning: "tư" },
  c: { hanzi: "词", pinyin: "cí", meaning: "từ" },
  s: { hanzi: "思", pinyin: "sī", meaning: "nghĩ" },
  a: { hanzi: "啊", pinyin: "a", meaning: "à/ồ" },
  o: { hanzi: "哦", pinyin: "o", meaning: "ồ" },
  e: { hanzi: "饿", pinyin: "è", meaning: "đói" },
  i: { hanzi: "衣", pinyin: "yī", meaning: "áo" },
  u: { hanzi: "乌", pinyin: "wū", meaning: "đen" },
  ü: { hanzi: "鱼", pinyin: "yú", meaning: "cá" },
  ai: { hanzi: "爱", pinyin: "ài", meaning: "yêu" },
  ei: { hanzi: "诶", pinyin: "ēi", meaning: "ê" },
  ao: { hanzi: "奥", pinyin: "ào", meaning: "sâu/áo" },
  ou: { hanzi: "欧", pinyin: "ōu", meaning: "Âu" },
  ia: { hanzi: "呀", pinyin: "ya", meaning: "a/nhé" },
  ie: { hanzi: "也", pinyin: "yě", meaning: "cũng" },
  ua: { hanzi: "蛙", pinyin: "wā", meaning: "ếch" },
  uo: { hanzi: "我", pinyin: "wǒ", meaning: "tôi" },
  üe: { hanzi: "月", pinyin: "yuè", meaning: "tháng/trăng" },
  an: { hanzi: "安", pinyin: "ān", meaning: "yên ổn" },
  en: { hanzi: "恩", pinyin: "ēn", meaning: "ơn" },
  in: { hanzi: "音", pinyin: "yīn", meaning: "âm" },
  un: { hanzi: "温", pinyin: "wēn", meaning: "ấm" },
  ün: { hanzi: "云", pinyin: "yún", meaning: "mây" },
  ian: { hanzi: "烟", pinyin: "yān", meaning: "khói" },
  uan: { hanzi: "弯", pinyin: "wān", meaning: "cong" },
  ang: { hanzi: "昂", pinyin: "áng", meaning: "ngẩng cao" },
  eng: { hanzi: "冷", pinyin: "lěng", meaning: "lạnh" },
  ing: { hanzi: "英", pinyin: "yīng", meaning: "anh/tài" },
  ong: { hanzi: "翁", pinyin: "wēng", meaning: "ông lão" },
  iang: { hanzi: "羊", pinyin: "yáng", meaning: "dê/cừu" },
  uang: { hanzi: "王", pinyin: "wáng", meaning: "vua/họ Vương" },
  iong: { hanzi: "用", pinyin: "yòng", meaning: "dùng" },
};

const toneExamples = [
  { tone: "Thanh 1", mark: "mā", note: "cao và ngang", text: "妈" },
  { tone: "Thanh 2", mark: "má", note: "đi lên", text: "麻" },
  { tone: "Thanh 3", mark: "mǎ", note: "xuống rồi lên", text: "马" },
  { tone: "Thanh 4", mark: "mà", note: "rơi mạnh", text: "骂" },
  { tone: "Thanh nhẹ", mark: "ma", note: "ngắn, nhẹ", text: "吗" },
];

const rules = [
  {
    title: "j/q/x đi với ü",
    example: "去 / qù",
    detail: "Khi ü đứng sau j, q, x thì bỏ hai chấm: ju, qu, xu nhưng vẫn đọc là ü.",
  },
  {
    title: "zh/ch/sh khác z/c/s",
    example: "吃 / chī, 四 / sì",
    detail: "zh/ch/sh cong lưỡi nhẹ; z/c/s giữ lưỡi phẳng gần răng.",
  },
  {
    title: "Thanh 3 trước thanh 3",
    example: "你好 / ní hǎo",
    detail: "Hai thanh 3 đi liền nhau thì âm đầu thường đọc gần như thanh 2.",
  },
  {
    title: "不 đổi thanh",
    example: "不是 / bú shì",
    detail: "不 đứng trước thanh 4 thì đọc thành bú; các trường hợp khác thường là bù.",
  },
  {
    title: "一 đổi thanh",
    example: "一个 / yí ge, 一起 / yì qǐ",
    detail: "一 đổi theo âm phía sau, nên cần nghe theo cụm chứ không đọc máy móc.",
  },
  {
    title: "Pinyin không phải tiếng Việt",
    example: "xué, rì, zhōng",
    detail: "Đừng đọc theo mặt chữ Việt. Hãy nghe mẫu và bắt chước vị trí lưỡi.",
  },
];

const miniPractice = [
  { hanzi: "你好", pinyin: "nǐ hǎo", meaning: "xin chào" },
  { hanzi: "谢谢", pinyin: "xiè xie", meaning: "cảm ơn" },
  { hanzi: "中国", pinyin: "Zhōngguó", meaning: "Trung Quốc" },
  { hanzi: "学习", pinyin: "xuéxí", meaning: "học tập" },
  { hanzi: "朋友", pinyin: "péngyou", meaning: "bạn bè" },
  { hanzi: "再见", pinyin: "zài jiàn", meaning: "tạm biệt" },
];

const listeningQuestions = [
  {
    id: "tone-ma-1",
    title: "Phân biệt thanh điệu",
    prompt: "Nghe âm rồi chọn đúng pinyin.",
    text: "马",
    answer: "mǎ",
    choices: ["mā", "má", "mǎ", "mà"],
    tip: "Thanh 3 đi xuống rồi nhấc lên nhẹ.",
  },
  {
    id: "tone-ma-2",
    title: "Phân biệt thanh 4",
    prompt: "Nghe âm rơi mạnh rồi chọn đáp án.",
    text: "骂",
    answer: "mà",
    choices: ["mā", "má", "mǎ", "mà"],
    tip: "Thanh 4 ngắn, dứt khoát, giống hạ giọng mạnh.",
  },
  {
    id: "retroflex-flat",
    title: "zh/ch/sh và z/c/s",
    prompt: "Nghe từ rồi chọn pinyin đúng.",
    text: "吃",
    answer: "chī",
    choices: ["cī", "chī", "qī", "xī"],
    tip: "ch cần cong lưỡi nhẹ và bật hơi.",
  },
  {
    id: "jqx",
    title: "j/q/x",
    prompt: "Nghe âm mặt lưỡi, đừng đọc theo tiếng Việt.",
    text: "学",
    answer: "xué",
    choices: ["sué", "shué", "xué", "hué"],
    tip: "x đọc với miệng hơi bè, không phải s tiếng Việt.",
  },
  {
    id: "nasal-front-back",
    title: "Âm mũi trước và sau",
    prompt: "Nghe kỹ đuôi âm n/ng.",
    text: "忙",
    answer: "máng",
    choices: ["mán", "máng", "mǎn", "màng"],
    tip: "ang mở miệng rộng hơn an và kết thúc sâu hơn.",
  },
  {
    id: "bu-change",
    title: "Biến thanh của 不",
    prompt: "Nghe cụm rồi chọn cách đọc đúng.",
    text: "不是",
    answer: "bú shì",
    choices: ["bù shì", "bú shì", "bǔ shì", "bu shì"],
    tip: "不 đứng trước thanh 4 thường đổi thành bú.",
  },
];

const readingDrills = [
  { id: "read-hello", hanzi: "你好", pinyin: "nǐ hǎo", meaning: "xin chào", focus: "Thanh 3 + thanh 3: nǐ thường đọc gần thành ní." },
  { id: "read-thanks", hanzi: "谢谢", pinyin: "xiè xie", meaning: "cảm ơn", focus: "Âm thứ hai nhẹ hơn, không nhấn cả hai âm như nhau." },
  { id: "read-study", hanzi: "学习", pinyin: "xuéxí", meaning: "học tập", focus: "x đọc nhẹ, miệng hơi bè; đừng đọc thành s." },
  { id: "read-china", hanzi: "中国", pinyin: "Zhōngguó", meaning: "Trung Quốc", focus: "zh cong lưỡi nhẹ, ōng giữ âm mũi sau." },
  { id: "read-tea", hanzi: "喝茶", pinyin: "hē chá", meaning: "uống trà", focus: "chá là thanh 2, giọng đi lên rõ." },
  { id: "read-bu-shi", hanzi: "不是", pinyin: "bú shì", meaning: "không phải", focus: "不 đổi thành bú vì phía sau là thanh 4." },
  { id: "read-one", hanzi: "一个", pinyin: "yí ge", meaning: "một cái", focus: "一 trước thanh 4 đổi thành yí, 个 đọc nhẹ." },
  { id: "read-friend", hanzi: "朋友", pinyin: "péngyou", meaning: "bạn bè", focus: "友 đọc nhẹ, không kéo quá dài." },
];

function getSoundSample(sound: string) {
  return soundSamples[sound] ?? { hanzi: sound, pinyin: sound, meaning: "âm mẫu" };
}

export default async function PinyinPage() {
  const user = await getCurrentUser();
  if (user) {
    await recordStudyActivity(user.id, "pinyin");
  }

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />

      <section className="mx-auto max-w-[960px] px-5 py-6">
        <Link className="text-sm font-semibold text-orange-700 hover:text-orange-800" href="/">
          ← Về trang chủ
        </Link>
        <div className="mt-4 rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Pinyin nhập môn</p>
          <h1 className="mt-2 text-3xl font-bold">Bảng phát âm cơ bản tiếng Trung</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            Học thanh mẫu, vận mẫu và thanh điệu trước khi luyện nghe nói. Không cần IPA riêng, chỉ cần nắm pinyin chuẩn và nghe lặp lại.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Thanh mẫu</p>
              <p className="mt-1 text-lg font-semibold">21 âm</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Vận mẫu</p>
              <p className="mt-1 text-lg font-semibold">Cơ bản + ghép</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Thanh điệu</p>
              <p className="mt-1 text-lg font-semibold">4 thanh + nhẹ</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Luyện nghe và luyện đọc</p>
          <h2 className="text-xl font-semibold">Nghe phân biệt âm, đọc theo và nhận điểm</h2>
        </div>
        <PinyinPractice listeningQuestions={listeningQuestions} readingDrills={readingDrills} />
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Thanh mẫu</p>
          <h2 className="text-xl font-semibold">Âm đầu của một âm tiết</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {initials.map((group) => (
            <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm" key={group.group}>
              <h3 className="font-semibold">{group.group}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{group.tip}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <PinyinSoundCard key={item} sample={getSoundSample(item)} sound={item} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Vận mẫu</p>
          <h2 className="text-xl font-semibold">Phần vần đứng sau thanh mẫu</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {finals.map((group) => (
            <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm" key={group.group}>
              <h3 className="font-semibold">{group.group}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <PinyinSoundCard key={item} sample={getSoundSample(item)} sound={item} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Thanh điệu</p>
          <h2 className="text-xl font-semibold">Cùng một âm, đổi dấu là đổi nghĩa</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {toneExamples.map((item) => (
            <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm" key={item.mark}>
              <p className="font-serif text-5xl font-semibold text-orange-600">{item.text}</p>
              <h3 className="mt-3 font-semibold">{item.tone}</h3>
              <p className="mt-1 text-2xl font-semibold text-slate-700">{item.mark}</p>
              <p className="mt-2 text-sm text-slate-600">{item.note}</p>
              <SpeakButton activityId={`listen:word:pinyin-tone:${item.mark}`} className="mt-4" label="Nghe" text={item.text} />
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Quy tắc đọc</p>
          <h2 className="text-xl font-semibold">Những điểm dễ nhầm cần nhớ sớm</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rules.map((rule) => (
            <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm" key={rule.title}>
              <h3 className="font-semibold">{rule.title}</h3>
              <p className="mt-3 rounded border border-stone-200 bg-[#fffdf5] px-3 py-2 font-semibold text-orange-700">
                {rule.example}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{rule.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[960px] px-5 pb-10">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Luyện nhanh</p>
          <h2 className="text-xl font-semibold">Nghe và đọc theo các từ đầu tiên</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {miniPractice.map((item) => (
            <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm" key={item.hanzi}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-4xl font-semibold text-orange-600">{item.hanzi}</p>
                  <p className="mt-2 text-lg text-slate-600">{item.pinyin}</p>
                  <p className="mt-1 font-semibold">{item.meaning}</p>
                </div>
                <SpeakButton activityId={`listen:word:pinyin-mini:${item.hanzi}`} label="Nghe" text={item.hanzi} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
