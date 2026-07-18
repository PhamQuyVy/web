"use client";

import { useEffect, useRef, useState } from "react";
import { pinyin } from "pinyin-pro";
import { recordStudyActivityAction } from "@/app/actions";
import { SpeakButton } from "./speak-button";

const PINYIN_READING_START_EVENT = "pinyin-reading-start";

type PinyinSoundCardProps = {
  sound: string;
  sample: {
    hanzi: string;
    pinyin: string;
    meaning: string;
  };
};

type PronunciationFeedback = {
  score: number;
  tone: "good" | "warn" | "bad";
  title: string;
  body: string;
  transcript: string;
  transcriptPinyin: string;
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

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

type PinyinReadingStartEvent = CustomEvent<{
  cardId: string;
}>;

function normalizeText(text: string) {
  return text
    .replace(/[。？！?!，,、；;\s]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ü/g, "v")
    .replace(/u:/g, "v")
    .toLowerCase();
}

function toPlainPinyin(text: string) {
  return normalizeText(
    pinyin(text, {
      toneType: "none",
      type: "string",
      nonZh: "consecutive",
    }),
  );
}

function toDisplayPinyin(text: string) {
  return pinyin(text, {
    toneType: "symbol",
    type: "string",
    nonZh: "consecutive",
  });
}

function getPronunciationFeedback(sound: string, sample: PinyinSoundCardProps["sample"], transcript: string): PronunciationFeedback {
  const targetSound = normalizeText(sound);
  const targetHanzi = normalizeText(sample.hanzi);
  const targetPinyin = normalizeText(sample.pinyin);
  const heardText = normalizeText(transcript);
  const heardPinyin = toPlainPinyin(transcript);

  if (!heardText && !heardPinyin) {
    return {
      score: 0,
      tone: "bad",
      title: "Chưa nghe rõ.",
      body: `Bấm Nghe mẫu, để micro gần hơn rồi đọc rõ ${sample.hanzi} / ${sample.pinyin}.`,
      transcript: "",
      transcriptPinyin: "",
    };
  }

  const exact =
    heardText === targetHanzi ||
    heardText.includes(targetHanzi) ||
    heardPinyin === targetPinyin ||
    heardPinyin.includes(targetPinyin);

  const close =
    exact ||
    heardPinyin.startsWith(targetSound) ||
    targetPinyin.startsWith(heardPinyin) ||
    heardText.includes(targetSound);

  if (exact) {
    return {
      score: 100,
      tone: "good",
      title: "Đọc đúng rồi.",
      body: `Máy nghe ra đúng ${sample.hanzi} / ${sample.pinyin}. Giữ khẩu hình này rồi tăng tốc từ từ.`,
      transcript,
      transcriptPinyin: toDisplayPinyin(transcript),
    };
  }

  if (close) {
    return {
      score: 75,
      tone: "warn",
      title: "Gần đúng rồi.",
      body: `Máy nghe khá gần. Mục tiêu là ${sample.hanzi} / ${sample.pinyin}; đọc chậm hơn và nhấn rõ âm ${sound}.`,
      transcript,
      transcriptPinyin: toDisplayPinyin(transcript),
    };
  }

  return {
    score: 35,
    tone: "bad",
    title: "Chưa khớp âm.",
    body: `Máy nghe thành âm khác. Bấm Nghe mẫu, bắt chước đúng ${sample.hanzi} / ${sample.pinyin} rồi đọc lại.`,
    transcript,
    transcriptPinyin: toDisplayPinyin(transcript),
  };
}

export function PinyinSoundCard({ sound, sample }: PinyinSoundCardProps) {
  const cardId = `${sound}-${sample.hanzi}-${sample.pinyin}`;
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const ignoreNextEndRef = useRef(false);

  function stopCurrentRecognition(ignoreEnd = false) {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (ignoreEnd) {
      ignoreNextEndRef.current = true;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  useEffect(() => {
    function clearOtherCards(event: Event) {
      const readingEvent = event as PinyinReadingStartEvent;
      if (readingEvent.detail.cardId === cardId) {
        return;
      }

      stopCurrentRecognition(true);
      setIsRecording(false);
      setStatusMessage("");
      setFeedback(null);
    }

    window.addEventListener(PINYIN_READING_START_EVENT, clearOtherCards);

    return () => {
      window.removeEventListener(PINYIN_READING_START_EVENT, clearOtherCards);
      stopCurrentRecognition(true);
    };
  }, [cardId]);

  function startReading() {
    window.dispatchEvent(new CustomEvent(PINYIN_READING_START_EVENT, { detail: { cardId } }));
    void recordStudyActivityAction(`pinyin:${sound}`);
    setFeedback(null);
    setStatusMessage("");

    const SpeechRecognition =
      (window as SpeechRecognitionWindow).SpeechRecognition || (window as SpeechRecognitionWindow).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsRecording(false);
      setStatusMessage("");
      setFeedback({
        score: 0,
        tone: "bad",
        title: "Trình duyệt chưa hỗ trợ nghe.",
        body: "Hãy mở bằng Chrome hoặc Edge để dùng chức năng luyện đọc pinyin.",
        transcript: "",
        transcriptPinyin: "",
      });
      return;
    }

    stopCurrentRecognition();

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    let heardResult = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim() ?? "";
      heardResult = Boolean(transcript);
      setFeedback(getPronunciationFeedback(sound, sample, transcript));
      setStatusMessage("");
      setIsRecording(false);
      stopCurrentRecognition(true);
    };

    recognition.onerror = (event) => {
      setIsRecording(false);
      setStatusMessage("");
      stopCurrentRecognition(true);
      setFeedback({
        score: 0,
        tone: "bad",
        title: event.error === "no-speech" ? "Chưa nghe thấy giọng đọc." : "Không nghe được micro.",
        body:
          event.error === "not-allowed"
            ? "Bạn cần cho phép quyền micro trên trình duyệt rồi bấm Đọc chữ lại."
            : `Đọc rõ ${sample.hanzi} / ${sample.pinyin} trong 3 giây đầu, đặt micro gần hơn một chút.`,
        transcript: "",
        transcriptPinyin: "",
      });
    };

    recognition.onend = () => {
      if (ignoreNextEndRef.current) {
        ignoreNextEndRef.current = false;
        return;
      }

      setIsRecording(false);
      if (!heardResult) {
        setStatusMessage("");
        setFeedback({
          score: 0,
          tone: "bad",
          title: "Chưa nghe rõ.",
          body: `Máy chưa bắt được chữ. Hãy đọc to, ngắn và rõ: ${sample.hanzi} / ${sample.pinyin}.`,
          transcript: "",
          transcriptPinyin: "",
        });
      }
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    setStatusMessage(`Đang nghe ${sample.hanzi} / ${sample.pinyin}...`);
    setFeedback(null);
    recognition.start();

    stopTimerRef.current = window.setTimeout(() => {
      if (!heardResult) {
        recognition.stop();
      }
    }, 5000);
  }

  return (
    <div className="rounded-md border border-stone-300 bg-[#fffdf5] p-2">
      <div className="flex items-center gap-2">
        <span className="min-w-16 text-center">
          <span className="block text-xl font-semibold">{sound}</span>
          <span className="mt-1 block font-serif text-2xl text-orange-600">{sample.hanzi}</span>
          <span className="mt-1 block text-xs text-slate-500">{sample.pinyin}</span>
        </span>
        <div className="flex flex-wrap gap-2">
          <SpeakButton
            activityId={`listen:word:pinyin:${sound}`}
            className="px-2 py-1 text-xs shadow-none"
            label="Nghe"
            text={sample.hanzi}
          />
          <button
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 shadow-sm hover:bg-stone-50"
            onClick={startReading}
            type="button"
          >
            {isRecording ? "Đang nghe..." : "Đọc chữ"}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Mẫu: {sample.meaning}</p>
      {statusMessage ? <p className="mt-2 text-xs font-medium text-blue-800">{statusMessage}</p> : null}
      {feedback ? (
        <div
          className={`mt-2 rounded-md border p-2 text-xs leading-5 ${
            feedback.tone === "good"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : feedback.tone === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-2 py-1 font-bold text-slate-950 shadow-sm">
              Điểm: {feedback.score}/100
            </span>
            <span className="font-semibold">Agent phát âm: {feedback.title}</span>
          </div>
          <p className="mt-2 font-serif text-sm text-slate-950">
            Máy nghe được:{" "}
            {feedback.transcript ? (
              <>
                {feedback.transcript}
                {feedback.transcriptPinyin ? ` (${feedback.transcriptPinyin})` : ""}
              </>
            ) : (
              "chưa nhận ra chữ rõ ràng"
            )}
          </p>
          <p className="mt-1">{feedback.body}</p>
        </div>
      ) : null}
    </div>
  );
}
