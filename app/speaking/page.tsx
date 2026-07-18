import Link from "next/link";
import { DialogueLinePractice } from "@/components/practice/dialogue-line-practice";
import { SiteHeader } from "@/components/layout/site-header";
import { SpeakingTrainer, type SpeakingPrompt } from "@/components/practice/speaking-trainer";
import { getCurrentUser } from "@/lib/auth";
import { getLibraryData, getVocabulary, recordStudyActivity } from "@/lib/db";

export const dynamic = "force-dynamic";

const topicPrompts: SpeakingPrompt[] = [
  {
    id: "self-intro",
    title: "T? gi?i thi?u",
    level: "HSK 1",
    hanzi: "??,????????,??????",
    pinyin: "Ni hao, wo jiao An. Wo shi xuesheng, wo xuexi Zhongwen.",
    meaning: "Xin ch�o, t�i t�n An. T�i l� h?c sinh, t�i h?c ti?ng Trung.",
    tip: "N�i t?ng c?m ng?n: ?? / ??... / ??... / ???...",
  },
  {
    id: "daily-routine",
    title: "K? sinh ho?t",
    level: "HSK 2",
    hanzi: "?????????,????????",
    pinyin: "Wo meitian zaoshang qi dian qichuang, ranhou qu xuexiao shangke.",
    meaning: "M?i s�ng t�i d?y l�c 7 gi?, sau d� d?n tru?ng h?c.",
    tip: "D�ng th? t? th?i gian: ???? + gi? + h�nh d?ng + ??.",
  },
  {
    id: "ask-directions",
    title: "H?i du?ng",
    level: "HSK 2",
    hanzi: "??,??????????????",
    pinyin: "Qingwen, ditie zhan zai nar? Cong zheli zou yuan ma?",
    meaning: "Xin h?i, ga t�u di?n ng?m ? d�u? �i b? t? d�y c� xa kh�ng?",
    tip: "M? d?u b?ng ?? d? l?ch s?, cu?i c�u d�ng ? d? h?i c�/kh�ng.",
  },
  {
    id: "opinion",
    title: "N�u � ki?n",
    level: "HSK 3",
    hanzi: "???????????,?????????",
    pinyin: "Wo juede xuexi Zhongwen hen youyisi, danshi shengdiao youdianr nan.",
    meaning: "T�i th?y h?c ti?ng Trung r?t th� v?, nhung thanh di?u hoi kh�.",
    tip: "D�ng ??? d? m? � ki?n, ?? d? n�i di?m kh�.",
  },
  {
    id: "comparison",
    title: "So s�nh",
    level: "HSK 3",
    hanzi: "?????????,?????????",
    pinyin: "Wo juede tingli bi yufa nan, suoyi wo yao duo ting duo shuo.",
    meaning: "T�i th?y nghe kh� hon ng? ph�p, n�n t�i ph?i nghe v� n�i nhi?u hon.",
    tip: "M?u so s�nh: A + ? + B + t�nh t?.",
  },
  {
    id: "work-plan",
    title: "K? ho?ch c�ng vi?c",
    level: "HSK 4",
    hanzi: "???????,?????,???????",
    pinyin: "Ruguo mingtian you shijian, wo xiang xian kaihui, ranhou wancheng baogao.",
    meaning: "N?u ng�y mai c� th?i gian, t�i mu?n h?p tru?c, sau d� ho�n th�nh b�o c�o.",
    tip: "Gh�p di?u ki?n b?ng ??, r?i s?p th? t? v?i ?...??.",
  },
  {
    id: "advanced-view",
    title: "Tr�nh b�y quan di?m",
    level: "HSK 5",
    hanzi: "??????????????,???????????????",
    pinyin: "Wo renwei changqi lianxi bujin neng tigao kouyu, ye neng bangzhu women geng ziran de biaoda xiangfa.",
    meaning: "T�i cho r?ng luy?n t?p l�u d�i kh�ng ch? n�ng cao kh?u ng?, m� c�n gi�p ch�ng ta di?n d?t suy nghi t? nhi�n hon.",
    tip: "D�ng ??? d? n�u quan di?m, ??...?... d? m? r?ng �.",
  },
  {
    id: "debate",
    title: "Tranh lu?n nh?",
    level: "HSK 4",
    hanzi: "???????,??????????",
    pinyin: "Wo tongyi ni de kanfa, buguo wo hai you yi ge wenti.",
    meaning: "T�i d?ng � v?i quan di?m c?a b?n, nhung t�i v?n c�n m?t c�u h?i.",
    tip: "D�ng ??? d? m?m gi?ng, ?? d? chuy?n � l?ch s?.",
  },
  {
    id: "presentation",
    title: "M? d?u thuy?t tr�nh",
    level: "HSK 5",
    hanzi: "??????????,????????",
    pinyin: "Jintian wo xiang jieshao san ge zhongdian, shouxian shi xuexi mubiao.",
    meaning: "H�m nay t�i mu?n gi?i thi?u ba tr?ng di?m, d?u ti�n l� m?c ti�u h?c t?p.",
    tip: "N�i r� s? lu?ng � tru?c, d�ng ?? d? m? � d?u.",
  },
  {
    id: "advanced-summary",
    title: "T�m t?t n�ng cao",
    level: "HSK 6",
    hanzi: "????,??????????????",
    pinyin: "Zong de lai shuo, changqi jianchi bi duan shijian nuli geng zhongyao.",
    meaning: "N�i chung, ki�n tr� l�u d�i quan tr?ng hon c? g?ng trong th?i gian ng?n.",
    tip: "D�ng ???? d? k?t lu?n, ? d? so s�nh hai �.",
  },
];

function getSpeakingLevelOrder(level: string) {
  const match = level.match(/HSK\s*(\d+)/i);

  if (!match) {
    return 99;
  }

  return Number(match[1]);
}

function compareSpeakingPrompts(promptA: SpeakingPrompt, promptB: SpeakingPrompt) {
  const levelOrder = getSpeakingLevelOrder(promptA.level) - getSpeakingLevelOrder(promptB.level);

  if (levelOrder !== 0) {
    return levelOrder;
  }

  return promptA.title.localeCompare(promptB.title, "vi");
}

const topicPromptTitles: Record<string, string> = {
  "self-intro": "Gi?i thi?u",
  "daily-routine": "Sinh ho?t",
  "ask-directions": "H?i du?ng",
  "opinion": "Quan di?m",
  "comparison": "So s�nh",
  "work-plan": "C�ng vi?c",
  "advanced-view": "Quan di?m",
  "debate": "Tranh lu?n",
  "presentation": "Thuy?t tr�nh",
  "advanced-summary": "T�m t?t",
};

const dialogueTopics: Record<string, string> = {
  "greeting-class": "L�m quen",
  "order-tea": "�? u?ng",
  "ask-price": "Mua s?m",
  "ask-directions": "H?i du?ng",
  "work-chat": "C�ng vi?c",
  "make-plan": "H?n l?ch",
  "morning-greeting": "Ch�o h?i",
  "family-intro": "Gia d�nh",
  "classroom-request": "L?p h?c",
  "ask-time": "Th?i gian",
  "restaurant-order": "An u?ng",
  "weather-chat": "Th?i ti?t",
  "buy-clothes": "Qu?n �o",
  "phone-call": "G?i di?n",
  "doctor-visit": "S?c kh?e",
  "hotel-checkin": "Kh�ch s?n",
  "study-plan-chat": "H?c t?p",
  "lost-item": "T�m d?",
  "work-meeting": "Cu?c h?p",
  "job-interview": "Ph?ng v?n",
  "travel-problem": "Du l?ch",
  "shopping-return": "�?i tr? h�ng",
  "express-opinion": "Quan di?m",
  "team-feedback": "G�p �",
  "news-discussion": "Tin t?c",
  "presentation-qna": "Thuy?t tr�nh",
  "debate-learning": "H?c online",
  "career-choice": "Ngh? nghi?p",
  "culture-comparison": "Van h�a",
  "formal-negotiation": "H?p t�c",
};

function cleanListeningTitle(title: string) {
  return title.replace(/^Nghe\s+/i, "");
}

function buildVocabularySpeakingExample(item: Awaited<ReturnType<typeof getVocabulary>>[number]): Pick<SpeakingPrompt, "hanzi" | "pinyin" | "meaning" | "tip"> {
  const type = item.type.toLowerCase();
  const meaning = item.meaning;
  const topic = item.topic ?? "t? v?ng";

  if (type.includes("d?ng t?")) {
    return {
      hanzi: `??????${item.hanzi}?`,
      meaning: `H�m nay t�i mu?n luy?n c�ch d�ng "${meaning}".`,
      pinyin: `T? kh�a: ${item.hanzi} (${item.pinyin})`,
      tip: `�?t "${item.hanzi}" sau ch? ng? d? luy?n h�nh d?ng trong ch? d? ${topic}.`,
    };
  }

  if (type.includes("t�nh t?")) {
    return {
      hanzi: `?????${item.hanzi}?`,
      meaning: `Th? n�y r?t ${meaning}.`,
      pinyin: `T? kh�a: ${item.hanzi} (${item.pinyin})`,
      tip: `D�ng ? + "${item.hanzi}" d? mi�u t? ng?n g?n trong ch? d? ${topic}.`,
    };
  }

  if (type.includes("ph� t?") || type.includes("li�n t?") || type.includes("gi?i t?")) {
    return {
      hanzi: `???${item.hanzi}??????`,
      meaning: `T�i mu?n d�ng "${meaning}" d? n�i m?t c�u.`,
      pinyin: `T? kh�a: ${item.hanzi} (${item.pinyin})`,
      tip: `T?p nghe v? tr� c?a "${item.hanzi}" trong c�u, r?i t? thay n?i dung ph�a sau.`,
    };
  }

  if (type.includes("d?i t?") || type.includes("s? t?") || type.includes("lu?ng t?")) {
    return {
      hanzi: `??????${item.hanzi}?`,
      meaning: `Trong c�u n�y c� "${meaning}".`,
      pinyin: `T? kh�a: ${item.hanzi} (${item.pinyin})`,
      tip: `�?c r� "${item.hanzi}" v� d�y l� t? ch?c nang d? nghe nh?m.`,
    };
  }

  if (type.includes("c?m") || item.hanzi.length >= 4) {
    return {
      hanzi: `???????�${item.hanzi}�?`,
      meaning: `T�i mu?n d�ng c?m "${meaning}" trong h?i tho?i.`,
      pinyin: `T? kh�a: ${item.hanzi} (${item.pinyin})`,
      tip: `�?c c? c?m "${item.hanzi}" li?n m?ch, kh�ng t�ch t?ng ch? qu� r?i.`,
    };
  }

  return {
    hanzi: `???????${item.hanzi}?`,
    meaning: `H�m nay ch�ng ta n�i m?t ch�t v? "${meaning}".`,
    pinyin: `T? kh�a: ${item.hanzi} (${item.pinyin})`,
    tip: `D�ng "${item.hanzi}" nhu ch? d? n�i ng?n trong nh�m ${topic}.`,
  };
}

export default async function SpeakingPage() {
  const user = await getCurrentUser();
  if (user) {
    await recordStudyActivity(user.id, "speaking");
  }

  const [{ dialogues, grammarPatterns, listeningPractice }, vocabulary] = await Promise.all([getLibraryData(), getVocabulary()]);
  const dialoguePrompts: SpeakingPrompt[] = dialogues.flatMap((dialogue) =>
    dialogue.lines.map((line, index) => ({
      id: `${dialogue.id}-${index}`,
      title: dialogueTopics[dialogue.id] ?? dialogue.title,
      level: dialogue.level,
      hanzi: line.hanzi,
      pinyin: line.pinyin,
      meaning: line.meaning,
      tip: `T�nh hu?ng: ${dialogue.situation}`,
    })),
  );
  const listeningPrompts: SpeakingPrompt[] = listeningPractice.map((item) => ({
    id: `listen-${item.id}`,
    title: cleanListeningTitle(item.title),
    level: item.level,
    hanzi: item.audioText,
    pinyin: item.pinyin,
    meaning: item.meaning,
    tip: "Nghe c? c�u, sau d� l?p l?i t?ng c?m tru?c khi n�i li?n m?ch.",
  }));
  const vocabularyPrompts: SpeakingPrompt[] = vocabulary.slice(0, 700).map((item) => ({
    id: `vocab-${item.id}`,
    title: item.topic ?? "T? v?ng",
    level: `HSK ${item.hsk}`,
    hanzi: buildVocabularySpeakingExample(item).hanzi,
    pinyin: buildVocabularySpeakingExample(item).pinyin,
    meaning: buildVocabularySpeakingExample(item).meaning,
    tip: buildVocabularySpeakingExample(item).tip,
  }));
  const grammarPrompts: SpeakingPrompt[] = grammarPatterns.flatMap((pattern) =>
    pattern.examples.slice(0, 2).map((example, index) => {
      const [hanzi, meaning = ""] = example.split("=");

      return {
        id: `grammar-${pattern.id}-${index}`,
        title: pattern.title,
        level: pattern.level,
        hanzi: hanzi.trim(),
        pinyin: pattern.formula,
        meaning: meaning.trim(),
        tip: `D�ng c�ng th?c ${pattern.formula}. �?c ch?m ph?n hu t? tru?c, r?i n?i c? c�u.`,
      };
    }),
  );
  const topicPracticePrompts = topicPrompts.map((prompt) => ({
    ...prompt,
    title: topicPromptTitles[prompt.id] ?? prompt.title,
  }));
  const prompts = [...topicPracticePrompts, ...dialoguePrompts, ...listeningPrompts, ...grammarPrompts, ...vocabularyPrompts].sort(compareSpeakingPrompts);
  const sortedDialogues = [...dialogues].sort((dialogueA, dialogueB) => {
    const levelOrder = getSpeakingLevelOrder(dialogueA.level) - getSpeakingLevelOrder(dialogueB.level);

    if (levelOrder !== 0) {
      return levelOrder;
    }

    return dialogueA.title.localeCompare(dialogueB.title, "vi");
  });

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-slate-950">
      <SiteHeader />
      <section className="mx-auto max-w-[900px] px-5 py-6">
        <Link className="text-sm font-semibold text-orange-700 hover:text-orange-800" href="/">
          ? V? trang ch?
        </Link>
        <div className="mt-4 rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Luy?n n�i</p>
          <h1 className="mt-2 text-3xl font-bold">Nghe m?u, d?c theo, r?i t? n�i</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            Luy?n ph�t �m, thanh di?u v� ph?n x? n�i qua c�u m?u, h?i tho?i, b�i nghe v� v� d? t? v?ng.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">B�i n�i</p>
              <p className="mt-1 text-lg font-semibold">{prompts.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">H?i tho?i</p>
              <p className="mt-1 text-lg font-semibold">{dialogues.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">B�i nghe</p>
              <p className="mt-1 text-lg font-semibold">{listeningPractice.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">C�u ng? ph�p</p>
              <p className="mt-1 text-lg font-semibold">{grammarPrompts.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">C�u t? v?ng</p>
              <p className="mt-1 text-lg font-semibold">{vocabularyPrompts.length}</p>
            </div>
          </div>
          <a className="mt-4 inline-flex rounded-md border border-orange-600 bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700" href="#quick-dialogues">
            Xem h?i tho?i nhanh
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">B?ng luy?n n�i</p>
          <h2 className="text-xl font-semibold">N�i t?ng c�u, c� coach s?a ngay</h2>
        </div>
        <SpeakingTrainer prompts={prompts} />
      </section>

      <section id="quick-dialogues" className="mx-auto max-w-[900px] px-5 pb-10">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">H?i tho?i nhanh</p>
          <h2 className="text-xl font-semibold">Nghe t?ng c�u, d?c theo t?ng c�u</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {sortedDialogues.map((dialogue) => (
            <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm" key={dialogue.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{dialogue.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{dialogue.situation}</p>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">{dialogue.level}</span>
              </div>
              <DialogueLinePractice dialogueId={dialogue.id} lines={dialogue.lines} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
