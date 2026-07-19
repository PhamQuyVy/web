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
    title: "Tự giới thiệu",
    level: "HSK 1",
    hanzi: "你好，我叫安。我是学生，我学习中文。",
    pinyin: "Nǐ hǎo, wǒ jiào Ān. Wǒ shì xuéshēng, wǒ xuéxí Zhōngwén.",
    meaning: "Xin chào, tôi tên An. Tôi là học sinh, tôi học tiếng Trung.",
    tip: "Nói từng cụm ngắn: 你好 / 我叫... / 我是... / 我学习...",
  },
  {
    id: "daily-routine",
    title: "Kể sinh hoạt",
    level: "HSK 2",
    hanzi: "我每天早上七点起床，然后去学校上课。",
    pinyin: "Wǒ měitiān zǎoshang qī diǎn qǐchuáng, ránhòu qù xuéxiào shàngkè.",
    meaning: "Mỗi sáng tôi dậy lúc 7 giờ, sau đó đến trường học.",
    tip: "Dùng thứ tự thời gian: mỗi ngày + giờ + hành động + 然后.",
  },
  {
    id: "ask-directions",
    title: "Hỏi đường",
    level: "HSK 2",
    hanzi: "请问，地铁站在哪儿？从这里走远吗？",
    pinyin: "Qǐngwèn, dìtiě zhàn zài nǎr? Cóng zhèlǐ zǒu yuǎn ma?",
    meaning: "Xin hỏi, ga tàu điện ngầm ở đâu? Đi bộ từ đây có xa không?",
    tip: "Mở đầu bằng 请问 để lịch sự, cuối câu dùng 吗 để hỏi có/không.",
  },
  {
    id: "opinion",
    title: "Nêu ý kiến",
    level: "HSK 3",
    hanzi: "我觉得学习中文很有意思，但是声调有点儿难。",
    pinyin: "Wǒ juéde xuéxí Zhōngwén hěn yǒuyìsi, dànshì shēngdiào yǒudiǎnr nán.",
    meaning: "Tôi thấy học tiếng Trung rất thú vị, nhưng thanh điệu hơi khó.",
    tip: "Dùng 我觉得 để mở ý kiến, 但是 để nói điểm khó.",
  },
  {
    id: "comparison",
    title: "So sánh",
    level: "HSK 3",
    hanzi: "我觉得听力比语法难，所以我要多听多说。",
    pinyin: "Wǒ juéde tīnglì bǐ yǔfǎ nán, suǒyǐ wǒ yào duō tīng duō shuō.",
    meaning: "Tôi thấy nghe khó hơn ngữ pháp, nên tôi phải nghe và nói nhiều hơn.",
    tip: "Mẫu so sánh: A + 比 + B + tính từ.",
  },
  {
    id: "work-plan",
    title: "Kế hoạch công việc",
    level: "HSK 4",
    hanzi: "如果明天有时间，我想先开会，然后完成报告。",
    pinyin: "Rúguǒ míngtiān yǒu shíjiān, wǒ xiǎng xiān kāihuì, ránhòu wánchéng bàogào.",
    meaning: "Nếu ngày mai có thời gian, tôi muốn họp trước, sau đó hoàn thành báo cáo.",
    tip: "Ghép điều kiện bằng 如果, rồi sắp thứ tự với 先...然后.",
  },
  {
    id: "advanced-view",
    title: "Trình bày quan điểm",
    level: "HSK 5",
    hanzi: "我认为长期练习不仅能提高口语，也能帮助我们更自然地表达想法。",
    pinyin: "Wǒ rènwéi chángqī liànxí bùjǐn néng tígāo kǒuyǔ, yě néng bāngzhù wǒmen gèng zìrán de biǎodá xiǎngfǎ.",
    meaning: "Tôi cho rằng luyện tập lâu dài không chỉ nâng cao khẩu ngữ, mà còn giúp chúng ta diễn đạt suy nghĩ tự nhiên hơn.",
    tip: "Dùng 我认为 để nêu quan điểm, 不仅...也... để mở rộng ý.",
  },
  {
    id: "debate",
    title: "Tranh luận nhẹ",
    level: "HSK 4",
    hanzi: "我同意你的看法，不过我还有一个问题。",
    pinyin: "Wǒ tóngyì nǐ de kànfǎ, búguò wǒ hái yǒu yí ge wèntí.",
    meaning: "Tôi đồng ý với quan điểm của bạn, nhưng tôi vẫn còn một câu hỏi.",
    tip: "Dùng 我同意 để mềm giọng, 不过 để chuyển ý lịch sự.",
  },
  {
    id: "presentation",
    title: "Mở đầu thuyết trình",
    level: "HSK 5",
    hanzi: "今天我想介绍三个重点，首先是学习目标。",
    pinyin: "Jīntiān wǒ xiǎng jièshào sān ge zhòngdiǎn, shǒuxiān shì xuéxí mùbiāo.",
    meaning: "Hôm nay tôi muốn giới thiệu ba trọng điểm, đầu tiên là mục tiêu học tập.",
    tip: "Nói rõ số lượng ý trước, dùng 首先 để mở ý đầu.",
  },
  {
    id: "advanced-summary",
    title: "Tóm tắt nâng cao",
    level: "HSK 6",
    hanzi: "总的来说，长期坚持比短时间努力更重要。",
    pinyin: "Zǒng de lái shuō, chángqī jiānchí bǐ duǎn shíjiān nǔlì gèng zhòngyào.",
    meaning: "Nói chung, kiên trì lâu dài quan trọng hơn cố gắng trong thời gian ngắn.",
    tip: "Dùng 总的来说 để kết luận, 比 để so sánh hai ý.",
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
  "self-intro": "Giới thiệu",
  "daily-routine": "Sinh hoạt",
  "ask-directions": "Hỏi đường",
  "opinion": "Quan điểm",
  "comparison": "So sánh",
  "work-plan": "Công việc",
  "advanced-view": "Quan điểm",
  "debate": "Tranh luận",
  "presentation": "Thuyết trình",
  "advanced-summary": "Tóm tắt",
};

const dialogueTopics: Record<string, string> = {
  "greeting-class": "Làm quen",
  "order-tea": "Đồ uống",
  "ask-price": "Mua sắm",
  "ask-directions": "Hỏi đường",
  "work-chat": "Công việc",
  "make-plan": "Hẹn lịch",
  "morning-greeting": "Chào hỏi",
  "family-intro": "Gia đình",
  "classroom-request": "Lớp học",
  "ask-time": "Thời gian",
  "restaurant-order": "Ăn uống",
  "weather-chat": "Thời tiết",
  "buy-clothes": "Quần áo",
  "phone-call": "Gọi điện",
  "doctor-visit": "Sức khỏe",
  "hotel-checkin": "Khách sạn",
  "study-plan-chat": "Học tập",
  "lost-item": "Tìm đồ",
  "work-meeting": "Cuộc họp",
  "job-interview": "Phỏng vấn",
  "travel-problem": "Du lịch",
  "shopping-return": "Đổi trả hàng",
  "express-opinion": "Quan điểm",
  "team-feedback": "Góp ý",
  "news-discussion": "Tin tức",
  "presentation-qna": "Thuyết trình",
  "debate-learning": "Học online",
  "career-choice": "Nghề nghiệp",
  "culture-comparison": "Văn hóa",
  "formal-negotiation": "Hợp tác",
};

function cleanListeningTitle(title: string) {
  return title.replace(/^Nghe\s+/i, "");
}

function buildVocabularySpeakingExample(item: Awaited<ReturnType<typeof getVocabulary>>[number]): Pick<SpeakingPrompt, "hanzi" | "pinyin" | "meaning" | "tip"> {
  const type = item.type.toLowerCase();
  const meaning = item.meaning;
  const topic = item.topic ?? "từ vựng";

  if (type.includes("động từ")) {
    return {
      hanzi: `今天我想练习“${item.hanzi}”。`,
      meaning: `Hôm nay tôi muốn luyện cách dùng "${meaning}".`,
      pinyin: `Từ khóa: ${item.hanzi} (${item.pinyin})`,
      tip: `Đặt "${item.hanzi}" sau chủ ngữ để luyện hành động trong chủ đề ${topic}.`,
    };
  }

  if (type.includes("tính từ")) {
    return {
      hanzi: `这个东西很${item.hanzi}。`,
      meaning: `Thứ này rất ${meaning}.`,
      pinyin: `Từ khóa: ${item.hanzi} (${item.pinyin})`,
      tip: `Dùng 很 + "${item.hanzi}" để miêu tả ngắn gọn trong chủ đề ${topic}.`,
    };
  }

  if (type.includes("phó từ") || type.includes("liên từ") || type.includes("giới từ")) {
    return {
      hanzi: `我想用“${item.hanzi}”说一句话。`,
      meaning: `Tôi muốn dùng "${meaning}" để nói một câu.`,
      pinyin: `Từ khóa: ${item.hanzi} (${item.pinyin})`,
      tip: `Tập nghe vị trí của "${item.hanzi}" trong câu, rồi tự thay nội dung phía sau.`,
    };
  }

  if (type.includes("đại từ") || type.includes("số từ") || type.includes("lượng từ")) {
    return {
      hanzi: `这句话里有“${item.hanzi}”。`,
      meaning: `Trong câu này có "${meaning}".`,
      pinyin: `Từ khóa: ${item.hanzi} (${item.pinyin})`,
      tip: `Đọc rõ "${item.hanzi}" vì đây là từ chức năng dễ nghe nhầm.`,
    };
  }

  if (type.includes("cụm") || item.hanzi.length >= 4) {
    return {
      hanzi: `我想在对话里用“${item.hanzi}”。`,
      meaning: `Tôi muốn dùng cụm "${meaning}" trong hội thoại.`,
      pinyin: `Từ khóa: ${item.hanzi} (${item.pinyin})`,
      tip: `Đọc cả cụm "${item.hanzi}" liền mạch, không tách từng chữ quá rời.`,
    };
  }

  return {
    hanzi: `我们聊一聊“${item.hanzi}”。`,
    meaning: `Hôm nay chúng ta nói một chút về "${meaning}".`,
    pinyin: `Từ khóa: ${item.hanzi} (${item.pinyin})`,
    tip: `Dùng "${item.hanzi}" như chủ đề nói ngắn trong nhóm ${topic}.`,
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
      tip: `Tình huống: ${dialogue.situation}`,
    })),
  );
  const listeningPrompts: SpeakingPrompt[] = listeningPractice.map((item) => ({
    id: `listen-${item.id}`,
    title: cleanListeningTitle(item.title),
    level: item.level,
    hanzi: item.audioText,
    pinyin: item.pinyin,
    meaning: item.meaning,
    tip: "Nghe cả câu, sau đó lặp lại từng cụm trước khi nói liền mạch.",
  }));
  const vocabularyPrompts: SpeakingPrompt[] = vocabulary.slice(0, 700).map((item) => {
    const example = buildVocabularySpeakingExample(item);

    return {
      id: `vocab-${item.id}`,
      title: item.topic ?? "Từ vựng",
      level: `HSK ${item.hsk}`,
      hanzi: example.hanzi,
      pinyin: example.pinyin,
      meaning: example.meaning,
      tip: example.tip,
    };
  });
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
        tip: `Dùng công thức ${pattern.formula}. Đọc chậm phần hư từ trước, rồi nối cả câu.`,
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
          ← Về trang chủ
        </Link>
        <div className="mt-4 rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Luyện nói</p>
          <h1 className="mt-2 text-3xl font-bold">Nghe mẫu, đọc theo, rồi tự nói</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            Luyện phát âm, thanh điệu và phản xạ nói qua câu mẫu, hội thoại, bài nghe và ví dụ từ vựng.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Bài nói</p>
              <p className="mt-1 text-lg font-semibold">{prompts.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Hội thoại</p>
              <p className="mt-1 text-lg font-semibold">{dialogues.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Bài nghe</p>
              <p className="mt-1 text-lg font-semibold">{listeningPractice.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Câu ngữ pháp</p>
              <p className="mt-1 text-lg font-semibold">{grammarPrompts.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#f8f7f3] px-4 py-3">
              <p className="text-xs uppercase text-slate-500">Câu từ vựng</p>
              <p className="mt-1 text-lg font-semibold">{vocabularyPrompts.length}</p>
            </div>
          </div>
          <a className="mt-4 inline-flex rounded-md border border-orange-600 bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700" href="#quick-dialogues">
            Xem hội thoại nhanh
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-5 pb-8">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Bảng luyện nói</p>
          <h2 className="text-xl font-semibold">Nói từng câu, có coach sửa ngay</h2>
        </div>
        <SpeakingTrainer prompts={prompts} />
      </section>

      <section id="quick-dialogues" className="mx-auto max-w-[900px] px-5 pb-10">
        <div className="mb-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Hội thoại nhanh</p>
          <h2 className="text-xl font-semibold">Nghe từng câu, đọc theo từng câu</h2>
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
