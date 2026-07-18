"use client";

import { useMemo, useState } from "react";
import { GrammarExampleLine, PinyinLine } from "./chinese-pinyin";
import type { GrammarPattern } from "@/lib/types";

type GrammarPatternBrowserProps = {
  patterns: GrammarPattern[];
};

function getLevelTone(level: string) {
  if (level.includes("1")) {
    return "bg-orange-50 text-orange-700";
  }
  if (level.includes("2")) {
    return "bg-blue-50 text-blue-700";
  }
  if (level.includes("3")) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (level.includes("4")) {
    return "bg-violet-50 text-violet-700";
  }
  if (level.includes("5")) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-stone-100 text-slate-700";
}

export function GrammarPatternBrowser({ patterns }: GrammarPatternBrowserProps) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [visibleCount, setVisibleCount] = useState(30);
  const levels = Array.from(new Set(patterns.map((pattern) => pattern.level))).sort();
  const filteredPatterns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return patterns.filter((pattern) => {
      const matchesLevel = level === "all" || pattern.level === level;
      const matchesQuery =
        !normalizedQuery ||
        pattern.title.toLowerCase().includes(normalizedQuery) ||
        pattern.formula.toLowerCase().includes(normalizedQuery) ||
        pattern.explanation.toLowerCase().includes(normalizedQuery) ||
        pattern.examples.some((example) => example.toLowerCase().includes(normalizedQuery));

      return matchesLevel && matchesQuery;
    });
  }, [level, patterns, query]);
  const visiblePatterns = filteredPatterns.slice(0, visibleCount);

  return (
    <div className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[1fr_170px]">
        <input
          className="h-11 rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-orange-600"
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(30);
          }}
          placeholder="Tìm mẫu, công thức, ví dụ..."
          value={query}
        />
        <select
          className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-orange-600"
          onChange={(event) => {
            setLevel(event.target.value);
            setVisibleCount(30);
          }}
          value={level}
        >
          <option value="all">Tất cả cấp độ</option>
          {levels.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {visiblePatterns.map((pattern) => (
          <article key={pattern.id} className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{pattern.title}</h3>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getLevelTone(pattern.level)}`}>
                {pattern.level}
              </span>
            </div>
            <div className="mt-3 rounded border border-stone-200 bg-[#fffdf5] px-3 py-2 text-sm font-semibold">
              <p>{pattern.formula}</p>
              <PinyinLine text={pattern.formula} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{pattern.explanation}</p>
            <div className="mt-4 space-y-2">
              {pattern.examples.map((example) => (
                <GrammarExampleLine key={example} example={example} />
              ))}
            </div>
          </article>
        ))}
      </div>

      {visiblePatterns.length < filteredPatterns.length ? (
        <button
          className="mt-5 h-11 w-full rounded-md border border-stone-300 bg-white text-sm font-semibold hover:bg-stone-50"
          onClick={() => setVisibleCount((current) => current + 30)}
          type="button"
        >
          Hiện thêm mẫu
        </button>
      ) : null}
    </div>
  );
}
