import { pinyin } from "pinyin-pro";

const chinesePattern = /[\u3400-\u9fff]+/g;

export function getChinesePinyin(text: string) {
  const chineseText = Array.from(text.matchAll(chinesePattern), (match) => match[0]).join(" ");
  if (!chineseText) {
    return "";
  }

  return pinyin(chineseText, {
    toneType: "symbol",
    type: "string",
    nonZh: "removed",
  });
}

export function PinyinLine({ text }: { text: string }) {
  const pinyinText = getChinesePinyin(text);

  if (!pinyinText) {
    return null;
  }

  return <p className="mt-1 text-xs leading-5 text-slate-500">{pinyinText}</p>;
}

export function GrammarExampleLine({ example }: { example: string }) {
  const [sentence, meaning] = example.split("=");

  return (
    <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-slate-700">
      <p className="font-serif text-base text-slate-950">{sentence.trim()}</p>
      <PinyinLine text={sentence} />
      {meaning ? <p className="mt-1">{meaning.trim()}</p> : null}
    </div>
  );
}
