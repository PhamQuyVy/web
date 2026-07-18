"use client";

import { useMemo, useState } from "react";
import { recordStudyActivityAction } from "@/app/actions";
import { WritingPad } from "./writing-pad";

export type WritingPracticeItem = {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  hsk: number;
  topic: string;
  example: string;
  exampleMeaning: string;
};

type WritingCharacterLibraryProps = {
  items: WritingPracticeItem[];
};

export function WritingCharacterLibrary({ items }: WritingCharacterLibraryProps) {
  const [selected, setSelected] = useState(items[0]);
  const [query, setQuery] = useState("");
  const [hsk, setHsk] = useState("all");
  const [visibleCount, setVisibleCount] = useState(96);

  const filteredCharacters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesHsk = hsk === "all" || item.hsk === Number(hsk);
      const matchesQuery =
        !normalizedQuery ||
        item.hanzi.includes(normalizedQuery) ||
        item.pinyin.toLowerCase().includes(normalizedQuery) ||
        item.meaning.toLowerCase().includes(normalizedQuery) ||
        item.topic.toLowerCase().includes(normalizedQuery) ||
        item.example.includes(normalizedQuery) ||
        item.exampleMeaning.toLowerCase().includes(normalizedQuery);

      return matchesHsk && matchesQuery;
    });
  }, [items, hsk, query]);

  const visibleCharacters = filteredCharacters.slice(0, visibleCount);
  const levels = Array.from(new Set(items.map((item) => item.hsk))).sort((a, b) => a - b);

  function selectCharacter(item: WritingPracticeItem) {
    setSelected(item);
    void recordStudyActivityAction(`writing:${item.id}`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_160px]">
          <input
            className="h-11 rounded-md border border-stone-300 px-3 outline-none focus:border-orange-600"
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(96);
            }}
            placeholder="Tìm chữ, pinyin, nghĩa..."
            value={query}
          />
          <select
            className="h-11 rounded-md border border-stone-300 bg-white px-3 outline-none focus:border-orange-600"
            onChange={(event) => {
              setHsk(event.target.value);
              setVisibleCount(96);
            }}
            value={hsk}
          >
            <option value="all">Tất cả HSK</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                HSK {level}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {visibleCharacters.map((item) => (
            <button
              className={`relative aspect-square rounded-md border bg-[#fffdf5] px-1 font-serif font-semibold transition hover:border-orange-500 hover:text-orange-600 ${
                selected?.id === item.id ? "border-orange-600 text-orange-600 ring-1 ring-orange-500" : "border-stone-300"
              }`}
              key={item.id}
              onClick={() => selectCharacter(item)}
              type="button"
            >
              <span className={item.hanzi.length > 2 ? "text-lg leading-tight" : "text-3xl"}>
                {item.hanzi}
              </span>
              <span className="absolute bottom-1 right-1 rounded bg-white/80 px-1 font-sans text-[10px] text-slate-500">
                H{item.hsk}
              </span>
            </button>
          ))}
        </div>

        {visibleCharacters.length < filteredCharacters.length ? (
          <button
            className="mt-4 h-11 w-full rounded-md border border-stone-300 bg-white font-semibold hover:bg-stone-50"
            onClick={() => setVisibleCount((current) => current + 96)}
            type="button"
          >
            Hiện thêm chữ
          </button>
        ) : null}
      </div>

      <article className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        {selected ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className={selected.hanzi.length > 2 ? "font-serif text-4xl font-semibold text-orange-600" : "font-serif text-7xl font-semibold text-orange-600"}>
                  {selected.hanzi}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  HSK {selected.hsk} · {selected.topic}
                </p>
                <p className="mt-2 font-semibold">{selected.meaning}</p>
                <p className="mt-1 text-sm text-slate-600">{selected.pinyin}</p>
              </div>
            </div>
            <div className="mb-4 rounded-md border border-stone-200 bg-[#fffdf5] p-3 text-sm leading-6 text-slate-700">
              <p className="font-serif text-lg text-slate-950">{selected.example}</p>
              <p>{selected.exampleMeaning}</p>
            </div>
            <WritingPad hanzi={selected.hanzi} key={selected.id} meaning={selected.meaning} />
          </>
        ) : null}
      </article>
    </div>
  );
}
