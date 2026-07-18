"use client";

import { useMemo, useRef, useState } from "react";
import { recordStudyActivityAction } from "@/app/actions";
import { SpeakButton } from "./speak-button";

export type PinyinListeningQuestion = {
  id: string;
  title: string;
  prompt: string;
  text: string;
  answer: string;
  choices: string[];
  tip: string;
};

export type PinyinReadingDrill = {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  focus: string;
};

type PinyinPracticeProps = {
  listeningQuestions: PinyinListeningQuestion[];
  readingDrills: PinyinReadingDrill[];
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

function normalizeChinese(text: string) {
  return text.replace(/[。？！?!，,、；;\s]/g, "").toLowerCase();
}

function scoreReading(targetText: string, spokenText: string) {
  const target = Array.from(normalizeChinese(targetText));
  const spoken = Array.from(normalizeChinese(spokenText));

  if (!spoken.length) {
    return {
      score: 0,
      message: "Chưa nghe được giọng đọc. Hãy để micro gần hơn và đọc chậm lại.",
    };
  }

  const targetSet = new Set(target);
  const spokenSet = new Set(spoken);
  const matched = [...targetSet].filter((char) => spokenSet.has(char)).length;
  const orderMatched = target.filter((char, index) => spoken[index] === char).length;
  const coverage = matched / Math.max(targetSet.size, 1);
  const order = orderMatched / Math.max(target.length, 1);
  const score = Math.round((coverage * 0.7 + order * 0.3) * 100);

  return {
    score,
    message:
      score >= 90
        ? "Rất rõ. Giữ nhịp và thanh điệu như vậy."
        : score >= 70
          ? "Ổn rồi. Đọc chậm hơn một chút để thanh điệu rõ hơn."
          : score >= 45
            ? "Đúng hướng, nhưng cần nghe mẫu rồi đọc từng cụm ngắn."
            : "Chưa khớp. Hãy nghe lại mẫu, đọc từng âm rồi nối cả từ.",
  };
}

function scoreListening(isCorrect: boolean) {
  return {
    score: isCorrect ? 100 : 35,
    message: isCorrect
      ? "Nghe đúng âm rồi. Hãy bấm nghe lại và nhắc theo một lần nữa."
      : "Chưa phân biệt đúng âm. Nghe lại mẫu, chú ý thanh điệu và vị trí lưỡi.",
  };
}

export function PinyinPractice({ listeningQuestions, readingDrills }: PinyinPracticeProps) {
  const [listeningIndex, setListeningIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [readingIndex, setReadingIndex] = useState(0);
  const [recognizedText, setRecognizedText] = useState("");
  const [readingScore, setReadingScore] = useState<{ score: number; message: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningQuestion = listeningQuestions[listeningIndex] ?? listeningQuestions[0];
  const readingDrill = readingDrills[readingIndex] ?? readingDrills[0];
  const checked = selectedChoice !== null;
  const isCorrect = selectedChoice === listeningQuestion.answer;
  const listeningScore = checked ? scoreListening(isCorrect) : null;
  const readingStatus = useMemo(() => {
    if (!readingScore) {
      return "Nghe mẫu rồi bấm đọc để agent chấm phát âm.";
    }

    return `${readingScore.score}/100 - ${readingScore.message}`;
  }, [readingScore]);

  function nextListeningQuestion() {
    setListeningIndex((current) => (current + 1) % listeningQuestions.length);
    setSelectedChoice(null);
  }

  function nextReadingDrill() {
    setReadingIndex((current) => (current + 1) % readingDrills.length);
    setRecognizedText("");
    setReadingScore(null);
  }

  function startRecording() {
    void recordStudyActivityAction(`pinyin:reading:${readingDrill.id}`);
    const SpeechRecognition =
      (window as SpeechRecognitionWindow).SpeechRecognition || (window as SpeechRecognitionWindow).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setReadingScore({
        score: 0,
        message: "Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Hãy thử bằng Chrome.",
      });
      return;
    }

    recognitionRef.current?.stop();
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setRecognizedText(transcript);
      setReadingScore(scoreReading(readingDrill.hanzi, transcript));
    };
    recognition.onerror = () => {
      setIsRecording(false);
      setReadingScore({
        score: 0,
        message: "Chưa thu được giọng đọc. Kiểm tra quyền micro rồi thử lại.",
      });
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    setIsRecording(true);
    setRecognizedText("");
    setReadingScore(null);
    recognition.start();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Luyện nghe</p>
            <h3 className="mt-1 text-xl font-semibold">{listeningQuestion.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{listeningQuestion.prompt}</p>
          </div>
          <SpeakButton
            activityId={`listen:word:pinyin-listening:${listeningQuestion.id}`}
            label="Nghe âm"
            text={listeningQuestion.text}
          />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {listeningQuestion.choices.map((choice) => (
            <button
              className={`rounded-md border px-4 py-3 text-left font-semibold ${
                selectedChoice === choice
                  ? "border-orange-600 bg-orange-50 text-orange-700"
                  : "border-stone-300 bg-white hover:border-orange-500"
              }`}
              key={choice}
              onClick={() => {
                setSelectedChoice(choice);
                void recordStudyActivityAction(`pinyin:listening:${listeningQuestion.id}`);
              }}
              type="button"
            >
              {choice}
            </button>
          ))}
        </div>

        {checked ? (
          <div className={`mt-4 rounded-md border p-3 text-sm leading-6 ${isCorrect ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Agent luyện nghe</p>
              <p className="text-2xl font-bold">{listeningScore?.score}/100</p>
            </div>
            <p className="mt-1">
              {isCorrect ? "Đúng rồi." : `Chưa đúng. Đáp án là ${listeningQuestion.answer}.`} {listeningScore?.message}
            </p>
            <p className="mt-1">{listeningQuestion.tip}</p>
          </div>
        ) : null}

        <button
          className="mt-4 rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-stone-50"
          onClick={nextListeningQuestion}
          type="button"
        >
          Câu nghe khác
        </button>
      </article>

      <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Luyện đọc</p>
            <h3 className="mt-1 text-xl font-semibold">Đọc theo pinyin và thanh điệu</h3>
          </div>
          <button
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50"
            onClick={nextReadingDrill}
            type="button"
          >
            Bài khác
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-stone-200 bg-[#fffdf5] p-5">
          <p className="font-serif text-5xl font-semibold text-orange-600">{readingDrill.hanzi}</p>
          <p className="mt-3 text-xl font-semibold text-slate-700">{readingDrill.pinyin}</p>
          <p className="mt-1 text-sm text-slate-600">{readingDrill.meaning}</p>
          <p className="mt-3 rounded border border-stone-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700">
            Mẹo: {readingDrill.focus}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <SpeakButton
            activityId={`listen:sentence:pinyin-reading:${readingDrill.id}`}
            label="Nghe mẫu"
            text={readingDrill.hanzi}
          />
          <button
            className="rounded-md border border-orange-600 bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            onClick={startRecording}
            type="button"
          >
            {isRecording ? "Đang nghe..." : "Đọc để chấm"}
          </button>
        </div>

        <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-950">Agent luyện đọc</p>
          <p className="mt-1">{readingStatus}</p>
          {recognizedText ? <p className="mt-1 text-slate-500">Máy nghe được: {recognizedText}</p> : null}
        </div>
      </article>
    </div>
  );
}
