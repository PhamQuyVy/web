"use client";

import { useEffect, useState } from "react";
import { recordStudyActivityAction } from "@/app/actions";

type SpeakButtonProps = {
  text: string;
  label?: string;
  className?: string;
  rate?: number;
  activityId?: string;
};

export function SpeakButton({ text, label = "Nghe", className = "", rate = 0.82, activityId }: SpeakButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speak() {
    if (activityId) {
      void recordStudyActivityAction(activityId);
    }

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <button
      aria-label={`${label}: ${text}`}
      className={`rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-stone-50 ${className}`}
      onClick={speak}
      type="button"
    >
      {isSpeaking ? "Đang đọc..." : label}
    </button>
  );
}
