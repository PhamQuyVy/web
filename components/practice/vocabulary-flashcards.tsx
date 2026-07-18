"use client";

import { useMemo, useState } from "react";
import { recordStudyActivityAction } from "@/app/actions";
import type { VocabularyItem } from "@/lib/types";
import { SpeakButton } from "./speak-button";

type VocabularyFlashcardsProps = {
  vocabulary: VocabularyItem[];
};

export function VocabularyFlashcards({ vocabulary }: VocabularyFlashcardsProps) {
  const topics = useMemo(
    () => ["Tất cả", ...Array.from(new Set(vocabulary.map((item) => item.topic ?? "Khác"))).sort()],
    [vocabulary],
  );
  const hskLevels = useMemo(
    () => ["Tất cả", ...Array.from(new Set(vocabulary.map((item) => `HSK ${item.hsk}`))).sort()],
    [vocabulary],
  );
  const [topic, setTopic] = useState("Tất cả");
  const [hsk, setHsk] = useState("Tất cả");
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const cards = useMemo(() => {
    const filtered =
      vocabulary.filter((item) => {
        const matchesTopic = topic === "Tất cả" || (item.topic ?? "Khác") === topic;
        const matchesHsk = hsk === "Tất cả" || `HSK ${item.hsk}` === hsk;
        return matchesTopic && matchesHsk;
      });
    return filtered.length > 0 ? filtered : vocabulary;
  }, [hsk, topic, vocabulary]);

  const card = cards[index % cards.length];

  function chooseTopic(nextTopic: string) {
    setTopic(nextTopic);
    setIndex(0);
    setIsFlipped(false);
  }

  function chooseHsk(nextHsk: string) {
    setHsk(nextHsk);
    setIndex(0);
    setIsFlipped(false);
  }

  function nextCard() {
    const next = (index + 1) % cards.length;
    setIndex(next);
    if (cards[next]) {
      void recordStudyActivityAction(`vocabulary:${cards[next].id}`);
    }
    setIsFlipped(false);
  }

  function previousCard() {
    const next = (index - 1 + cards.length) % cards.length;
    setIndex(next);
    if (cards[next]) {
      void recordStudyActivityAction(`vocabulary:${cards[next].id}`);
    }
    setIsFlipped(false);
  }

  function randomCard() {
    const next = Math.floor(Math.random() * cards.length);
    setIndex(next);
    void recordStudyActivityAction(`vocabulary:${cards[next].id}`);
    setIsFlipped(false);
  }

  function flipCard() {
    void recordStudyActivityAction(`vocabulary:${card.id}`);
    setIsFlipped((value) => !value);
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Flashcard từ vựng</p>
          <h2 className="mt-1 text-xl font-semibold">Lật thẻ theo chủ đề</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>
            {cards.length ? (index % cards.length) + 1 : 0}/{cards.length}
          </span>
          <SpeakButton activityId={`listen:word:${card.id}`} label="Nghe thẻ" text={card.hanzi} />
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {topics.map((item) => (
          <button
            className={`shrink-0 rounded-full border px-3 py-2 text-sm font-medium ${
              item === topic
                ? "border-orange-600 bg-orange-50 text-orange-700"
                : "border-stone-300 bg-white text-slate-700 hover:bg-stone-50"
            }`}
            key={item}
            onClick={() => chooseTopic(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {hskLevels.map((item) => (
          <button
            className={`shrink-0 rounded-full border px-3 py-2 text-sm font-medium ${
              item === hsk
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-stone-300 bg-white text-slate-700 hover:bg-stone-50"
            }`}
            key={item}
            onClick={() => chooseHsk(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <button
        className="mt-5 flex min-h-[260px] w-full flex-col justify-center rounded-lg border border-stone-300 bg-[#fffdf5] p-6 text-left transition hover:border-orange-400"
        onClick={flipCard}
        type="button"
      >
        {!isFlipped ? (
          <>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              HSK {card.hsk}
            </span>
            <span className="mt-5 font-serif text-7xl font-semibold leading-none text-orange-600">{card.hanzi}</span>
            <span className="mt-4 text-lg text-slate-600">{card.pinyin}</span>
            <span className="mt-6 text-sm font-medium text-slate-500">Bấm thẻ để xem nghĩa và ví dụ</span>
          </>
        ) : (
          <>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.type}</span>
            <span className="mt-3 text-3xl font-semibold">{card.meaning}</span>
          </>
        )}
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:flex">
        <button className="rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-stone-50" onClick={previousCard} type="button">
          Trước
        </button>
        <button className="rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-stone-50" onClick={randomCard} type="button">
          Ngẫu nhiên
        </button>
        <button className="rounded-md border border-slate-900 bg-white px-4 py-3 text-sm font-semibold hover:bg-stone-50" onClick={nextCard} type="button">
          Tiếp
        </button>
      </div>
    </section>
  );
}
