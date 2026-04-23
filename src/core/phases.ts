import {
  MIN_GREEN_STRAIGHT_MS,
  MAX_GREEN_STRAIGHT_MS,
  MIN_GREEN_LEFT_MS,
  MAX_GREEN_LEFT_MS,
  YELLOW_DURATION_MS,
  PEDESTRIAN_CLEAR_MS,
} from '../constants';

// ---------------------------------------------------------------------------
// Phase enum
// ---------------------------------------------------------------------------

export enum IntersectionPhase {
  /** N/S straight+right green, N/S left flashing-orange (permissive). */
  NS_STRAIGHT = 'NS_STRAIGHT',
  /** N/S straight transitioning to red. */
  NS_YELLOW = 'NS_YELLOW',
  /** N/S left-turn dedicated green (both opposite sides simultaneously). */
  NS_LEFT = 'NS_LEFT',
  /** N/S left-turn yellow. */
  NS_LEFT_YELLOW = 'NS_LEFT_YELLOW',
  /** E/W straight+right green, E/W left flashing-orange. */
  EW_STRAIGHT = 'EW_STRAIGHT',
  /** E/W straight yellow. */
  EW_YELLOW = 'EW_YELLOW',
  /** E/W left-turn dedicated green. */
  EW_LEFT = 'EW_LEFT',
  /** E/W left-turn yellow. */
  EW_LEFT_YELLOW = 'EW_LEFT_YELLOW',
  /** All red – pedestrian crossing window. */
  PEDESTRIAN_CLEAR = 'PEDESTRIAN_CLEAR',
}

// ---------------------------------------------------------------------------
// Phase timing
// ---------------------------------------------------------------------------

export interface PhaseTiming {
  readonly minDuration: number;
  readonly maxDuration: number;
  /** If true, sensors cannot shorten/extend the phase. */
  readonly fixed: boolean;
}

export const PHASE_TIMING: Readonly<Record<IntersectionPhase, PhaseTiming>> = {
  [IntersectionPhase.NS_STRAIGHT]: {
    minDuration: MIN_GREEN_STRAIGHT_MS,
    maxDuration: MAX_GREEN_STRAIGHT_MS,
    fixed: false,
  },
  [IntersectionPhase.NS_YELLOW]: {
    minDuration: YELLOW_DURATION_MS,
    maxDuration: YELLOW_DURATION_MS,
    fixed: true,
  },
  [IntersectionPhase.NS_LEFT]: {
    minDuration: MIN_GREEN_LEFT_MS,
    maxDuration: MAX_GREEN_LEFT_MS,
    fixed: false,
  },
  [IntersectionPhase.NS_LEFT_YELLOW]: {
    minDuration: YELLOW_DURATION_MS,
    maxDuration: YELLOW_DURATION_MS,
    fixed: true,
  },
  [IntersectionPhase.EW_STRAIGHT]: {
    minDuration: MIN_GREEN_STRAIGHT_MS,
    maxDuration: MAX_GREEN_STRAIGHT_MS,
    fixed: false,
  },
  [IntersectionPhase.EW_YELLOW]: {
    minDuration: YELLOW_DURATION_MS,
    maxDuration: YELLOW_DURATION_MS,
    fixed: true,
  },
  [IntersectionPhase.EW_LEFT]: {
    minDuration: MIN_GREEN_LEFT_MS,
    maxDuration: MAX_GREEN_LEFT_MS,
    fixed: false,
  },
  [IntersectionPhase.EW_LEFT_YELLOW]: {
    minDuration: YELLOW_DURATION_MS,
    maxDuration: YELLOW_DURATION_MS,
    fixed: true,
  },
  [IntersectionPhase.PEDESTRIAN_CLEAR]: {
    minDuration: PEDESTRIAN_CLEAR_MS,
    maxDuration: PEDESTRIAN_CLEAR_MS,
    fixed: true,
  },
};

// ---------------------------------------------------------------------------
// Phase sequence (normal cycle, excluding PEDESTRIAN_CLEAR)
// ---------------------------------------------------------------------------

export const PHASE_SEQUENCE: readonly IntersectionPhase[] = [
  IntersectionPhase.NS_STRAIGHT,
  IntersectionPhase.NS_YELLOW,
  IntersectionPhase.NS_LEFT,
  IntersectionPhase.NS_LEFT_YELLOW,
  IntersectionPhase.EW_STRAIGHT,
  IntersectionPhase.EW_YELLOW,
  IntersectionPhase.EW_LEFT,
  IntersectionPhase.EW_LEFT_YELLOW,
];

/**
 * Returns the next phase after the current one in the normal cycle.
 * After a PEDESTRIAN_CLEAR the returned phase resumes from where the cycle
 * was interrupted (passed in as `resumePhase`).
 */
export function nextPhaseAfter(
  current: IntersectionPhase,
  resumePhase?: IntersectionPhase,
): IntersectionPhase {
  if (current === IntersectionPhase.PEDESTRIAN_CLEAR) {
    return resumePhase ?? IntersectionPhase.NS_STRAIGHT;
  }
  const idx = PHASE_SEQUENCE.indexOf(current);
  if (idx < 0) return IntersectionPhase.NS_STRAIGHT;
  return PHASE_SEQUENCE[(idx + 1) % PHASE_SEQUENCE.length];
}

/** True when the phase is a "green" phase that sensors can influence. */
export function isSensorAdaptable(phase: IntersectionPhase): boolean {
  return !PHASE_TIMING[phase].fixed;
}

/** True when the phase is a transition (yellow or pedestrian). */
export function isTransitionPhase(phase: IntersectionPhase): boolean {
  return (
    phase === IntersectionPhase.NS_YELLOW ||
    phase === IntersectionPhase.NS_LEFT_YELLOW ||
    phase === IntersectionPhase.EW_YELLOW ||
    phase === IntersectionPhase.EW_LEFT_YELLOW ||
    phase === IntersectionPhase.PEDESTRIAN_CLEAR
  );
}
