"use client";

import { useMemo, useState } from "react";
import { getChinesePinyin, PinyinLine } from "./chinese-pinyin";

export type SentenceDrill = {
  id: string;
  title: string;
  formula: string;
  words: string[];
  answer: string[];
  meaning: string;
  tip?: string;
};

type SentenceBuilderProps = {
  drills: SentenceDrill[];
};

function rotateWords(words: string[], offset: number) {
  if (words.length <= 1) {
    return words;
  }

  return [...words.slice(offset), ...words.slice(0, offset)];
}

function PinyinToken({ text }: { text: string }) {
  const pinyinText = getChinesePinyin(text);

  if (!pinyinText) {
    return null;
  }

  return <span className="mt-1 block text-xs leading-4 text-slate-500">{pinyinText}</span>;
}

export function SentenceBuilder({ drills }: SentenceBuilderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const activeDrill = drills[activeIndex] ?? drills[0];
  const shuffledWords = useMemo(
    () => rotateWords(activeDrill.words, (activeIndex % Math.max(activeDrill.words.length - 1, 1)) + 1),
    [activeDrill.words, activeIndex],
  );
  const builtWords = selectedIndexes.map((index) => shuffledWords[index]);
  const isComplete = builtWords.length === activeDrill.answer.length;
  const isCorrect = builtWords.join("") === activeDrill.answer.join("");

  function chooseWord(index: number) {
    setChecked(false);
    setSelectedIndexes((current) => current.includes(index) ? current : [...current, index]);
  }

  function resetCurrent() {
    setSelectedIndexes([]);
    setChecked(false);
  }

  function nextDrill() {
    setActiveIndex((current) => (current + 1) % drills.length);
    setSelectedIndexes([]);
    setChecked(false);
  }

  return (
    <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Bài {activeIndex + 1}/{drills.length}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{activeDrill.title}</h3>
          <div className="mt-2 rounded border border-stone-200 bg-[#fffdf5] px-3 py-2 text-sm font-semibold">
            <p>{activeDrill.formula}</p>
            <PinyinLine text={activeDrill.formula} />
          </div>
          {activeDrill.tip ? (
            <p className="mt-2 max-w-xl rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-900">
              Mẹo: {activeDrill.tip}
            </p>
          ) : null}
        </div>
        <button
          className="h-10 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold hover:bg-stone-50"
          onClick={nextDrill}
          type="button"
        >
          Bài khác
        </button>
      </div>

      <div className="mt-4 rounded-md border border-dashed border-stone-300 bg-[#f8f7f3] p-3">
        <div className="flex min-h-12 flex-wrap items-center gap-2">
          {builtWords.length > 0 ? (
            builtWords.map((word, index) => (
              <button
                className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 font-serif text-lg font-semibold text-orange-700"
                key={`${word}-${index}`}
                onClick={() => {
                  setChecked(false);
                  setSelectedIndexes((current) => current.filter((_, selectedIndex) => selectedIndex !== index));
                }}
                type="button"
              >
                <span className="block">{word}</span>
                <PinyinToken text={word} />
              </button>
            ))
          ) : (
            <p className="text-sm text-slate-500">Chọn các mảnh bên dưới để ghép câu.</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {shuffledWords.map((word, index) => {
          const used = selectedIndexes.includes(index);

          return (
            <button
              className={`rounded-md border px-3 py-2 font-serif text-lg font-semibold transition ${
                used
                  ? "cursor-not-allowed border-stone-200 bg-stone-100 text-slate-400"
                  : "border-stone-300 bg-white hover:border-orange-500 hover:text-orange-600"
              }`}
              disabled={used}
              key={`${activeDrill.id}-${word}-${index}`}
              onClick={() => chooseWord(index)}
              type="button"
            >
              <span className="block">{word}</span>
              <PinyinToken text={word} />
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          className="h-10 rounded-md border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isComplete}
          onClick={() => setChecked(true)}
          type="button"
        >
          Kiểm tra
        </button>
        <button
          className="h-10 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold hover:bg-stone-50"
          onClick={resetCurrent}
          type="button"
        >
          Làm lại
        </button>
        {checked ? (
          <p className={`text-sm font-semibold ${isCorrect ? "text-emerald-700" : "text-red-700"}`}>
            {isCorrect ? `Đúng: ${activeDrill.meaning}` : `Chưa đúng. Đáp án: ${activeDrill.answer.join("")}`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
