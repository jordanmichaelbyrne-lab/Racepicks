export const basePoints = {
  first: 25,
  second: 22,
  third: 20,
  wildcard: 25,
} as const;

export type ScoringPosition = keyof typeof basePoints;

export function calculatePickPoints(
  position: ScoringPosition,
  isCorrect: boolean,
  multiplier = 1
) {
  if (!isCorrect) {
    return 0;
  }

  // Math.round turns 37.5 into 38.
  return Math.round(basePoints[position] * multiplier);
}

export function getMaximumRoundPoints(multiplier = 1) {
  return Object.values(basePoints).reduce(
    (total, points) => total + Math.round(points * multiplier),
    0
  );
}