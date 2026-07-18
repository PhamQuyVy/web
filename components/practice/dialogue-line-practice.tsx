"use client";

import { useRef, useState } from "react";
import { SpeakButton } from "./speak-button";

type DialogueLine = {
  speaker: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
};

type DialogueLinePracticeProps = {
  dialogueId: string;
  lines: DialogueLine[];
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

function analyzePronunciation(targetText: string, spokenText: string) {
  const target = Array.from(normalizeText(targetText));
  const spoken = Array.from(normalizeText(spokenText));

  if (!spoken.length) {
    return {
      score: 0,
      missing: target.slice(0, 8),
      extra: [] as string[],
      exact: false,
    };
  }

  const targetSet = new Set(target);
  const spokenSet = new Set(spoken);
  const missing = [...targetSet].filter((char) => !spokenSet.has(char));
  const extra = [...spokenSet].filter((char) => !targetSet.has(char));
  const orderMatches = target.filter((char, index) => spoken[index] === char).length;
  const coverage = [...targetSet].filter((char) => spokenSet.has(char)).length / Math.max(targetSet.size, 1);
  const orderScore = orderMatches / Math.max(target.length, 1);
  const lengthScore = Math.max(0, 1 - Math.abs(target.length - spoken.length) / Math.max(target.length, 1));
  const score = Math.round((coverage * 0.58 + orderScore * 0.28 + lengthScore * 0.14) * 100);

  return {
    score,
    missing: missing.slice(0, 8),
    extra: extra.slice(0, 8),
    exact: normalizeText(targetText) === normalizeText(spokenText),
  };
}

function formatChars(chars: string[]) {
  return chars.length ? chars.join("、") : "";
}

function getCoachFeedback(line: DialogueLine, transcript: string) {
  const analysis = analyzePronunciation(line.hanzi, transcript);
  const missing = formatChars(analysis.missing);
  const extra = formatChars(analysis.extra);

  if (analysis.exact || analysis.score >= 88) {
    return {
      tone: "good",
      title: `Rất tốt (${analysis.score}/100).`,
      body: "Máy nghe ra gần đúng câu. Giờ thử tăng tốc lên 0.9x và vẫn giữ rõ thanh điệu.",
    };
  }

  if (analysis.score >= 60) {
    return {
      tone: "warn",
      title: `Gần đúng rồi (${analysis.score}/100).`,
      body: `${missing ? `Cần đọc rõ hơn: ${missing}. ` : ""}${extra ? `Máy nghe lẫn thêm: ${extra}. ` : ""}Đọc lại theo pinyin: ${line.pinyin}`,
    };
  }

  return {
    tone: "bad",
    title: `Chưa ổn (${analysis.score}/100).`,
    body: `${missing ? `Ưu tiên cứu các âm/chữ: ${missing}. ` : ""}Hạ tốc độ nghe, nói từng cụm 2-4 chữ rồi mới nối cả câu.`,
  };
}

export function DialogueLinePractice({ dialogueId, lines }: DialogueLinePracticeProps) {
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [transcripts, setTranscripts] = useState<Record<number, string>>({});
  const [supportMessage, setSupportMessage] = useState("");
  const [rate, setRate] = useState(0.82);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  function startLinePractice(index: number) {
    const browserWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupportMessage("Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Bạn vẫn có thể nghe câu và tự đọc theo.");
      return;
    }

    recognitionRef.current?.stop();
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      setTranscripts((current) => ({
        ...current,
        [index]: event.results[0][0].transcript,
      }));
    };
    recognition.onend = () => {
      setActiveLineIndex(null);
    };
    recognition.onerror = () => {
      setActiveLineIndex(null);
      setSupportMessage("Không nghe rõ. Để micro gần hơn, nói chậm hơn và đọc đúng từng cụm.");
    };
    recognitionRef.current = recognition;
    setSupportMessage("");
    setTranscripts((current) => ({ ...current, [index]: "" }));
    setActiveLineIndex(index);
    recognition.start();
  }

  function stopLinePractice() {
    recognitionRef.current?.stop();
    setActiveLineIndex(null);
  }

  return (
    <div className="mt-4">
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

      {supportMessage ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{supportMessage}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {lines.map((line, lineIndex) => {
          const transcript = transcripts[lineIndex];
          const feedback = transcript ? getCoachFeedback(line, transcript) : null;

          return (
            <div className="rounded-md border border-stone-200 bg-[#fffdf5] p-3" key={`${dialogueId}-${lineIndex}-${line.speaker}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Câu {lineIndex + 1} · {line.speaker}
                  </p>
                  <p className="mt-1 font-serif text-xl text-orange-700">{line.hanzi}</p>
                  <p className="text-sm text-slate-500">{line.pinyin}</p>
                  <p className="mt-1 text-sm text-slate-700">{line.meaning}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <SpeakButton
                    activityId={`listen:sentence:dialogue:${dialogueId}:${lineIndex}`}
                    label="Nghe câu"
                    rate={rate}
                    text={line.hanzi}
                  />
                  <button
                    className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    onClick={activeLineIndex === lineIndex ? stopLinePractice : () => startLinePractice(lineIndex)}
                    type="button"
                  >
                    {activeLineIndex === lineIndex ? "Dừng nghe" : "Đọc theo"}
                  </button>
                </div>
              </div>

              {transcript ? (
                <div className="mt-3 rounded-md border border-stone-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Máy nghe được</p>
                  <p className="mt-1 font-serif text-lg text-slate-950">{transcript}</p>
                </div>
              ) : null}

              {feedback ? (
                <div
                  className={`mt-3 rounded-md border p-3 text-sm leading-6 ${
                    feedback.tone === "good"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : feedback.tone === "warn"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  <p className="font-semibold">Agent phát âm: {feedback.title}</p>
                  <p className="mt-1">{feedback.body}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
