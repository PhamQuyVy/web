"use client";

import { useMemo, useState } from "react";
import type { VocabularyItem } from "@/lib/types";
import { recordStudyActivityAction } from "@/app/actions";
import { SpeakButton } from "./speak-button";
import { WritingPad } from "./writing-pad";

type VocabularyBrowserProps = {
  vocabulary: VocabularyItem[];
};

const PAGE_SIZE = 96;
const ALL = "Tất cả";

export function VocabularyBrowser({ vocabulary }: VocabularyBrowserProps) {
  const topics = useMemo(
    () => [ALL, ...Array.from(new Set(vocabulary.map((item) => item.topic ?? "Khác"))).sort()],
    [vocabulary],
  );
  const hskLevels = useMemo(
    () => [ALL, ...Array.from(new Set(vocabulary.map((item) => `HSK ${item.hsk}`))).sort()],
    [vocabulary],
  );
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState(ALL);
  const [hsk, setHsk] = useState(ALL);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [writingId, setWritingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return vocabulary.filter((item) => {
      const matchesTopic = topic === ALL || (item.topic ?? "Khác") === topic;
      const matchesHsk = hsk === ALL || `HSK ${item.hsk}` === hsk;
      const searchable = `${item.hanzi} ${item.pinyin} ${item.meaning} ${item.type}`.toLowerCase();
      return matchesTopic && matchesHsk && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [hsk, query, topic, vocabulary]);

  const visible = filtered.slice(0, visibleCount);

  function resetTopic(nextTopic: string) {
    setTopic(nextTopic);
    setVisibleCount(PAGE_SIZE);
    setWritingId(null);
  }

  function resetHsk(nextHsk: string) {
    setHsk(nextHsk);
    setVisibleCount(PAGE_SIZE);
    setWritingId(null);
  }

  function resetQuery(nextQuery: string) {
    setQuery(nextQuery);
    setVisibleCount(PAGE_SIZE);
    setWritingId(null);
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Danh sách card</p>
          <h2 className="mt-1 text-xl font-semibold">Tìm và luyện từ vựng</h2>
        </div>
        <span className="text-sm text-slate-500">
          Hiển thị {visible.length}/{filtered.length} từ
        </span>
      </div>

      <div className="mt-4">
        <input
          className="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          onChange={(event) => resetQuery(event.target.value)}
          placeholder="Tìm chữ Hán, pinyin, nghĩa tiếng Việt..."
          type="search"
          value={query}
        />
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
            onClick={() => resetTopic(item)}
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
            onClick={() => resetHsk(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <article key={item.id} className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-serif text-4xl font-semibold text-orange-600">{item.hanzi}</p>
                <p className="mt-1 text-sm text-slate-500">{item.pinyin}</p>
              </div>
              <SpeakButton activityId={`listen:word:${item.id}`} label="Nghe" text={item.hanzi} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
                HSK {item.hsk}
              </span>
            </div>
            <p className="mt-3 font-semibold">{item.meaning}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{item.type}</p>
            <button
              className="mt-4 w-full rounded-md border border-stone-300 bg-[#fffdf5] px-3 py-2 text-sm font-semibold hover:border-orange-500 hover:text-orange-700"
              onClick={() => {
                setWritingId((current) => (current === item.id ? null : item.id));
                void recordStudyActivityAction(`writing:${item.id}`);
              }}
              type="button"
            >
              {writingId === item.id ? "Đóng tập viết" : "Tập viết từ này"}
            </button>
            {writingId === item.id ? (
              <div className="mt-4">
                <WritingPad compact hanzi={item.hanzi} key={item.id} meaning={item.meaning} />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {visibleCount < filtered.length ? (
        <button
          className="mt-5 rounded-md border border-slate-900 bg-white px-5 py-3 text-sm font-semibold hover:bg-stone-50"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          type="button"
        >
          Hiện thêm
        </button>
      ) : null}
    </section>
  );
}
