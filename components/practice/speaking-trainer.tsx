"use client";

import { useMemo, useRef, useState } from "react";
import { recordStudyActivityAction } from "@/app/actions";
import { SpeakButton } from "./speak-button";

export type SpeakingPrompt = {
  id: string;
  title: string;
  level: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  tip: string;
};

type SpeakingTrainerProps = {
  prompts: SpeakingPrompt[];
};

type SpeechRecognitionResultEventLike = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

function normalizeText(text: string) {
  return text.replace(/[。？！?!，,、；;\s]/g, "").toLowerCase();
}

function uniqueCharacters(text: string) {
  return [...new Set(Array.from(normalizeText(text)))];
}

function analyzeSpeech(targetText: string, spokenText: string) {
  const target = normalizeText(targetText);
  const spoken = normalizeText(spokenText);
  const targetChars = Array.from(target);
  const spokenChars = Array.from(spoken);

  if (!spokenChars.length) {
    return {
      score: 0,
      missing: uniqueCharacters(target).slice(0, 8),
      extra: [] as string[],
      recognized: [] as string[],
      lengthGap: targetChars.length,
      exact: false,
    };
  }

  const targetSet = new Set(targetChars);
  const spokenSet = new Set(spokenChars);
  const missing = [...targetSet].filter((char) => !spokenSet.has(char));
  const extra = [...spokenSet].filter((char) => !targetSet.has(char));
  const recognized = [...targetSet].filter((char) => spokenSet.has(char));
  const orderMatches = targetChars.filter((char, index) => spokenChars[index] === char).length;
  const coverage = recognized.length / Math.max(targetSet.size, 1);
  const orderScore = orderMatches / Math.max(targetChars.length, 1);
  const score = Math.round((coverage * 0.72 + orderScore * 0.28) * 100);

  return {
    score,
    missing: missing.slice(0, 8),
    extra: extra.slice(0, 8),
    recognized: recognized.slice(0, 8),
    lengthGap: targetChars.length - spokenChars.length,
    exact: spoken === target || spoken.includes(target) || target.includes(spoken),
  };
}

function formatChars(chars: string[]) {
  return chars.length ? chars.join("、") : "";
}

function firstClause(text: string) {
  return text.split(/[，。？！?!,]/)[0] || text;
}

function getLevelOrder(level: string) {
  const match = level.match(/HSK\s*(\d+)/i);

  if (!match) {
    return 99;
  }

  return Number(match[1]);
}

function compareLevels(levelA: string, levelB: string) {
  const orderA = getLevelOrder(levelA);
  const orderB = getLevelOrder(levelB);

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return levelA.localeCompare(levelB, "vi");
}

function comparePrompts(promptA: SpeakingPrompt, promptB: SpeakingPrompt) {
  const levelOrder = compareLevels(promptA.level, promptB.level);

  if (levelOrder !== 0) {
    return levelOrder;
  }

  return promptA.title.localeCompare(promptB.title, "vi");
}

function buildCoachFeedback(prompt: SpeakingPrompt, transcript: string) {
  const analysis = analyzeSpeech(prompt.hanzi, transcript);
  const missingText = formatChars(analysis.missing);
  const extraText = formatChars(analysis.extra);
  const recognizedText = formatChars(analysis.recognized);
  const shortTarget = firstClause(prompt.hanzi);

  if (analysis.exact || analysis.score >= 88) {
    return {
      tone: "good",
      title: `Tốt, máy nghe ra gần đúng câu bạn nói (${analysis.score}%).`,
      body: recognizedText
        ? `Các âm/chữ chính đã bắt được: ${recognizedText}. Giờ tăng tốc nhẹ lên 0.9x và vẫn giữ rõ cụm "${shortTarget}".`
        : "Nhịp câu ổn. Giờ nói lại nhanh hơn một chút nhưng đừng làm mất thanh điệu.",
    };
  }

  if (analysis.score >= 55) {
    const lengthHint =
      analysis.lengthGap > 2
        ? "Bạn có vẻ nói thiếu đoạn cuối, đừng dừng sớm."
        : analysis.lengthGap < -2
          ? "Máy nghe ra hơi thừa âm, có thể bạn kéo hoặc lặp vài chữ."
          : "Độ dài khá ổn, vấn đề chính là vài âm chưa rõ.";
    const missingHint = missingText ? `Tập lại các chữ/cụm bị mất: ${missingText}.` : "Không mất nhiều chữ, nhưng thứ tự hoặc ngữ điệu còn lệch.";
    const extraHint = extraText ? ` Máy còn nghe lẫn thêm: ${extraText}; nói gọn miệng hơn ở đoạn đó.` : "";

    return {
      tone: "warn",
      title: `Gần đúng rồi (${analysis.score}%), nhưng chưa sạch câu.`,
      body: `${lengthHint} ${missingHint}${extraHint} Đọc lại theo pinyin: ${prompt.pinyin}`,
    };
  }

  const startingHint = analysis.recognized.length
    ? `Máy chỉ bắt được vài mảnh như ${recognizedText}.`
    : "Máy gần như chưa bắt được câu mục tiêu.";
  const missingHint = missingText ? `Đoạn cần cứu trước: ${missingText}.` : `Bắt đầu lại bằng cụm đầu: ${shortTarget}.`;

  return {
    tone: "bad",
    title: `Chưa ổn nha (${analysis.score}%). Câu máy nghe được còn xa câu mẫu.`,
    body: `${startingHint} ${missingHint} Hạ tốc độ nghe xuống 0.6x, đọc riêng cụm đầu 3 lần rồi mới nối cả câu. Mẹo riêng: ${prompt.tip}`,
  };
}

export function SpeakingTrainer({ prompts }: SpeakingTrainerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [rate, setRate] = useState(0.82);
  const [level, setLevel] = useState("all");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const levels = Array.from(new Set(prompts.map((prompt) => prompt.level))).sort(compareLevels);
  const filteredPrompts = useMemo(
    () => prompts.filter((prompt) => level === "all" || prompt.level === level).sort(comparePrompts),
    [level, prompts],
  );
  const activePrompt = filteredPrompts[activeIndex] ?? filteredPrompts[0] ?? prompts[0];
  const coachFeedback = transcript ? buildCoachFeedback(activePrompt, transcript) : null;

  function startListening() {
    void recordStudyActivityAction(`speaking:${activePrompt.id}`);
    const browserWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupportMessage("Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Bạn vẫn có thể nghe mẫu và tự đọc theo.");
      return;
    }

    recognitionRef.current?.stop();
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      setTranscript(event.results[0][0].transcript);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setSupportMessage("Không nghe rõ. Nói gần micro hơn, chậm hơn, và tách cụm ngắn.");
    };
    recognitionRef.current = recognition;
    setTranscript("");
    setSupportMessage("");
    setIsListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  function nextPrompt() {
    setActiveIndex((current) => (current + 1) % filteredPrompts.length);
    void recordStudyActivityAction(`speaking:${filteredPrompts[(activeIndex + 1) % filteredPrompts.length]?.id ?? activePrompt.id}`);
    setTranscript("");
    setSupportMessage("");
  }

  function changeLevel(nextLevel: string) {
    setLevel(nextLevel);
    setActiveIndex(0);
    setTranscript("");
    setSupportMessage("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Bài {activeIndex + 1}/{filteredPrompts.length} · {activePrompt.level}
            </p>
            <h3 className="mt-1 text-xl font-semibold">{activePrompt.title}</h3>
          </div>
          <button
            className="h-10 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold hover:bg-stone-50"
            onClick={nextPrompt}
            type="button"
          >
            Câu khác
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="rounded-lg border border-stone-200 bg-[#fffdf5] p-3">
            <p className="text-sm font-semibold text-slate-700">Chọn cấp độ luyện nói</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["all", ...levels].map((item) => {
                const active = level === item;
                const label = item === "all" ? "Tất cả" : item;

                return (
                  <button
                    className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${
                      active
                        ? "border-orange-600 bg-orange-600 text-white shadow-sm"
                        : "border-stone-300 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                    key={item}
                    onClick={() => changeLevel(item)}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <select
            className="sr-only"
            onChange={(event) => changeLevel(event.target.value)}
            value={level}
          >
            <option value="all">Tất cả cấp độ</option>
            {levels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-stone-300 px-3 text-sm text-slate-700">
            Tốc độ nghe
            <input
              className="h-2 flex-1 accent-orange-600"
              max="1.2"
              min="0.55"
              onChange={(event) => setRate(Number(event.target.value))}
              step="0.05"
              type="range"
              value={rate}
            />
            <span className="w-10 text-right font-semibold">{rate.toFixed(2)}x</span>
          </label>
        </div>

        <div className="mt-5 rounded-lg border border-stone-200 bg-[#fffdf5] p-5">
          <p className="font-serif text-3xl leading-10 text-orange-700">{activePrompt.hanzi}</p>
          <p className="mt-3 text-sm leading-6 text-slate-500">{activePrompt.pinyin}</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">{activePrompt.meaning}</p>
        </div>

        <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
          Mẹo: {activePrompt.tip}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <SpeakButton
            activityId={`listen:sentence:speaking:${activePrompt.id}`}
            label="Nghe mẫu"
            rate={rate}
            text={activePrompt.hanzi}
          />
          <button
            className="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={isListening ? stopListening : startListening}
            type="button"
          >
            {isListening ? "Dừng nghe" : "Thử nói"}
          </button>
        </div>

        {supportMessage ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{supportMessage}</p>
        ) : null}

        {transcript ? (
          <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Máy nghe được</p>
            <p className="mt-1 font-serif text-xl text-slate-950">{transcript}</p>
          </div>
        ) : null}

        {coachFeedback ? (
          <div
            className={`mt-4 rounded-md border p-4 text-sm leading-6 ${
              coachFeedback.tone === "good"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : coachFeedback.tone === "warn"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            <p className="font-semibold">Coach: {coachFeedback.title}</p>
            <p className="mt-1">{coachFeedback.body}</p>
          </div>
        ) : null}
      </article>

      <aside className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Coach luyện nói</h3>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          <li>1. Hạ tốc độ còn 0.65x nếu câu dài.</li>
          <li>2. Đọc theo cụm 3-5 chữ, đừng đọc cả câu một hơi.</li>
          <li>3. Thanh 3 đọc thấp rồi mới nhấc nhẹ lên.</li>
          <li>4. Sau khi đúng, tăng tốc độ lên 0.9x.</li>
        </ol>
        <div className="mt-5 rounded-md border border-stone-200 bg-[#fffdf5] p-3 text-sm leading-6 text-slate-700">
          Coach sẽ dựa vào câu máy nghe được để sửa, nên hãy nói rõ và để micro gần hơn một chút.
        </div>
      </aside>
    </div>
  );
}
