import { readFile, writeFile } from "fs/promises";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "app-db.json");
const sourcePath = process.argv[2] ?? path.join(process.env.TEMP ?? process.cwd(), "hsk6-old.json");

const posMap = {
  a: "tính từ",
  ad: "trạng/tính từ",
  an: "danh/tính từ",
  b: "tính từ",
  c: "liên từ",
  d: "trạng từ",
  e: "thán từ",
  i: "thành ngữ",
  l: "cụm cố định",
  m: "số từ",
  n: "danh từ",
  nr: "danh từ riêng",
  ns: "địa danh",
  nt: "tổ chức",
  q: "lượng từ",
  r: "đại từ",
  t: "thời gian từ",
  u: "trợ từ",
  v: "động từ",
  vd: "động/trạng từ",
  vn: "danh/động từ",
  y: "ngữ khí từ",
  z: "từ mô tả",
};

const topicRules = [
  ["Pháp luật", /law|legal|court|crime|punish|prison|case|lawsuit|criminal|police/i],
  ["Kinh tế", /econom|market|price|finance|business|profit|trade|salary|bank|investment|tax|budget/i],
  ["Công việc", /work|job|office|task|career|profession|employ|meeting|manage|leader|responsib/i],
  ["Cảm xúc", /feel|mood|emotion|angry|happy|sad|fear|worry|anxious|regret|jealous|complain/i],
  ["Y tế", /ill|disease|hospital|doctor|cancer|health|medicine|pain|symptom|treat|therapy/i],
  ["Xã hội", /society|public|people|citizen|government|policy|nation|population|custom|culture/i],
  ["Học thuật", /research|theory|science|study|education|knowledge|analysis|concept|principle/i],
  ["Thiên nhiên", /nature|earth|climate|weather|river|mountain|plant|animal|environment|resource/i],
  ["Giao tiếp", /say|speak|talk|tell|ask|answer|discuss|express|explain|suggest|promise|persuade/i],
  ["Đời sống", /life|family|home|food|clothes|sleep|habit|daily|marry|house|personal/i],
];

function slugify(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function pickType(pos) {
  const labels = [...new Set((pos ?? []).map((item) => posMap[item]).filter(Boolean))];
  return labels.length ? labels.slice(0, 2).join("/") : "từ HSK 6";
}

function pickTopic(meanings) {
  const text = meanings.join("; ");
  return topicRules.find(([, pattern]) => pattern.test(text))?.[0] ?? "HSK 6";
}

function cleanMeaning(meanings) {
  return meanings
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join("; ");
}

const db = JSON.parse(await readFile(dbPath, "utf8"));
const hsk6 = JSON.parse(await readFile(sourcePath, "utf8"));
const existingByHanzi = new Map(db.vocabulary.map((item) => [item.hanzi, item]));
const existingHanzi = new Set(db.vocabulary.map((item) => item.hanzi));
const existingIds = new Set(db.vocabulary.map((item) => item.id));

const additions = [];
let updatedExisting = 0;

hsk6.forEach((entry, index) => {
  if (!entry?.simplified) {
    return;
  }

  const form = entry.forms?.[0];
  const pinyin = form?.transcriptions?.pinyin ?? "";
  const meanings = form?.meanings ?? [];
  const meaning = cleanMeaning(meanings) || "HSK 6 vocabulary";

  if (existingHanzi.has(entry.simplified)) {
    const existing = existingByHanzi.get(entry.simplified);
    if (existing && existing.hsk !== 6) {
      existing.hsk = 6;
      existing.pinyin ||= pinyin;
      existing.topic ||= pickTopic(meanings);
      updatedExisting += 1;
    }
    return;
  }

  const idBase = `hsk6-${slugify(pinyin) || "word"}-${index + 1}`;
  let id = idBase;
  let suffix = 2;

  while (existingIds.has(id)) {
    id = `${idBase}-${suffix}`;
    suffix += 1;
  }

  existingIds.add(id);
  existingHanzi.add(entry.simplified);
  additions.push({
    id,
    hanzi: entry.simplified,
    pinyin,
    type: pickType(entry.pos),
    meaning,
    example: `这个词在HSK六级里很常见。`,
    exampleMeaning: "Từ này thường gặp trong HSK 6.",
    hsk: 6,
    topic: pickTopic(meanings),
  });
});

db.vocabulary.push(...additions);

await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");

console.log(`Imported ${additions.length} and updated ${updatedExisting} HSK 6 vocabulary items from ${sourcePath}.`);
