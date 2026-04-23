import { IntersectionPhase, PHASE_TIMING, isSensorAdaptable } from './phases';
import { Direction, DIRECTIONS } from './signal';
import { Lanes, waitingForDirection } from './lane';
import { STARVATION_THRESHOLD_MS, SENSOR_EXTEND_PER_CAR_MS } from '../constants';

// ---------------------------------------------------------------------------
// Sensor state
// ---------------------------------------------------------------------------

/** Per-direction tracking of how long each approach has been held at red. */
export type RedDurations = Readonly<Record<Direction, number>>;

export function createRedDurations(): RedDurations {
  return { north: 0, south: 0, east: 0, west: 0 };
}

/**
 * Update red-duration counters.
 * Directions that are green this tick get reset; all others accumulate time.
 */
export function updateRedDurations(
  current: RedDurations,
  phase: IntersectionPhase,
  deltaMs: number,
): RedDurations {
  const greenDirs = greenDirectionsForPhase(phase);
  const next: Record<Direction, number> = { ...current };
  for (const dir of DIRECTIONS) {
    if (greenDirs.has(dir)) {
      next[dir] = 0;
    } else {
      next[dir] = (current[dir] ?? 0) + deltaMs;
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// Phase duration adaptation
// ---------------------------------------------------------------------------

/**
 * Compute the effective phase duration based on sensor data.
 *
 * - Fixed phases: return the min (= max) duration unchanged.
 * - Sensor-adaptable phases: start from minDuration and add
 *   SENSOR_EXTEND_PER_CAR_MS per waiting car on the green approaches,
 *   capped at maxDuration.
 */
export function computePhaseDuration(phase: IntersectionPhase, lanes: Lanes): number {
  const timing = PHASE_TIMING[phase];
  if (!isSensorAdaptable(phase)) return timing.minDuration;

  const greenDirs = greenDirectionsForPhase(phase);
  let waitingCars = 0;
  for (const dir of greenDirs) {
    waitingCars += waitingForDirection(lanes, dir);
  }

  const extended = timing.minDuration + waitingCars * SENSOR_EXTEND_PER_CAR_MS;
  return Math.min(extended, timing.maxDuration);
}

/**
 * Returns true if the starvation guard should override normal cycle order
 * to give the given direction its minimum green immediately.
 */
export function isStarving(redDurations: RedDurations, dir: Direction): boolean {
  return (redDurations[dir] ?? 0) >= STARVATION_THRESHOLD_MS;
}

/**
 * Which phase in the normal cycle would serve the given direction next?
 * Returns the first NS or EW straight phase that covers it.
 */
export function phaseForDirection(dir: Direction): IntersectionPhase {
  if (dir === 'north' || dir === 'south') return IntersectionPhase.NS_STRAIGHT;
  return IntersectionPhase.EW_STRAIGHT;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function greenDirectionsForPhase(phase: IntersectionPhase): Set<Direction> {
  switch (phase) {
    case IntersectionPhase.NS_STRAIGHT:
    case IntersectionPhase.NS_LEFT:
      return new Set<Direction>(['north', 'south']);
    case IntersectionPhase.EW_STRAIGHT:
    case IntersectionPhase.EW_LEFT:
      return new Set<Direction>(['east', 'west']);
    default:
      return new Set<Direction>();
  }
}
