export type TranscriptScoreWeights = {
  coverage: number;
  order: number;
  length?: number;
};

export function normalizeTranscript(text: string) {
  return text.replace(/[。？！?!，,、；;\s]/g, "").toLowerCase();
}

export function analyzeTranscript(
  targetText: string,
  spokenText: string,
  weights: TranscriptScoreWeights = { coverage: 0.72, order: 0.28 },
) {
  const target = normalizeTranscript(targetText);
  const spoken = normalizeTranscript(spokenText);
  const targetChars = Array.from(target);
  const spokenChars = Array.from(spoken);
  const targetSet = new Set(targetChars);
  const spokenSet = new Set(spokenChars);

  if (!spokenChars.length) {
    return {
      score: 0,
      missing: [...targetSet].slice(0, 8),
      extra: [] as string[],
      recognized: [] as string[],
      lengthGap: targetChars.length,
      exact: false,
    };
  }

  const missing = [...targetSet].filter((char) => !spokenSet.has(char));
  const extra = [...spokenSet].filter((char) => !targetSet.has(char));
  const recognized = [...targetSet].filter((char) => spokenSet.has(char));
  const orderMatches = targetChars.filter((char, index) => spokenChars[index] === char).length;
  const coverage = recognized.length / Math.max(targetSet.size, 1);
  const orderScore = orderMatches / Math.max(targetChars.length, 1);
  const lengthScore = Math.max(0, 1 - Math.abs(targetChars.length - spokenChars.length) / Math.max(targetChars.length, 1));
  const score = Math.round(
    (coverage * weights.coverage + orderScore * weights.order + lengthScore * (weights.length ?? 0)) * 100,
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    missing: missing.slice(0, 8),
    extra: extra.slice(0, 8),
    recognized: recognized.slice(0, 8),
    lengthGap: targetChars.length - spokenChars.length,
    exact: spoken === target,
  };
}
