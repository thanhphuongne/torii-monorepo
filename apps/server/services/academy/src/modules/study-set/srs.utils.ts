import { SrsState } from '@prisma/generated/enums';

export function calculateSrsInterval(
  currentState: SrsState,
  currentIntervalSeconds: number,
  quality: number,
): { srsState: SrsState; interval: number; nextReviewAt: Date } {
  let newState = currentState;
  let newInterval = currentIntervalSeconds;

  if (quality === 0) {
    // Reset to LEARNING state, interval to 1 min
    newState = SrsState.LEARNING;
    newInterval = 60; // 1 min
  } else {
    // KNOW (quality === 1)
    if (currentState === SrsState.LEARNING) {
      newState = SrsState.MASTERED;
      newInterval = 24 * 60 * 60; // 1 day
    } else if (currentState === SrsState.MASTERED) {
      // Apply multiplier for mastered cards
      newInterval = Math.max(currentIntervalSeconds * 2.5, 24 * 60 * 60);
    }
  }

  const nextReviewAt = new Date(Date.now() + newInterval * 1000);

  return {
    srsState: newState,
    interval: Math.round(newInterval),
    nextReviewAt,
  };
}
