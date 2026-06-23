/** Competition ranking: tied percentages share the same rank; next rank skips (1, 1, 3). */
export function computeExamRanks(
  entries: { studentId: string; percentage: number }[],
): Map<string, number> {
  const sorted = [...entries].sort((a, b) => b.percentage - a.percentage);
  const ranks = new Map<string, number>();
  let rank = 0;
  let lastPct: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    if (lastPct === null || entry.percentage < lastPct) {
      rank = i + 1;
      lastPct = entry.percentage;
    }
    ranks.set(entry.studentId, rank);
  }

  return ranks;
}
