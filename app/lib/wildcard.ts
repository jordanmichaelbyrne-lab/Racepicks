export function chooseBalancedWildcard(previousPositions: number[]) {
  const possiblePositions = Array.from(
    { length: 9 },
    (_, index) => index + 7
  );

  const usageCounts = new Map<number, number>();

  for (const position of possiblePositions) {
    usageCounts.set(position, 0);
  }

  for (const position of previousPositions) {
    usageCounts.set(position, (usageCounts.get(position) ?? 0) + 1);
  }

  const recentPositions = new Set(previousPositions.slice(-2));

  let candidates = possiblePositions.filter(
    (position) => !recentPositions.has(position)
  );

  if (candidates.length === 0) {
    candidates = possiblePositions;
  }

  const lowestUsage = Math.min(
    ...candidates.map((position) => usageCounts.get(position) ?? 0)
  );

  const balancedCandidates = candidates.filter(
    (position) => (usageCounts.get(position) ?? 0) === lowestUsage
  );

  return balancedCandidates[
    Math.floor(Math.random() * balancedCandidates.length)
  ];
}