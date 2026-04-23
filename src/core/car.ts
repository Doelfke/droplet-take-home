import { Direction, LaneType } from './signal';

// ---------------------------------------------------------------------------
// Car
// ---------------------------------------------------------------------------

/**
 * A single vehicle in the simulation.
 *
 * ASCII art for the task requirement:
 *
 *   ______
 *  /|_||_\`.__
 * (   _    _ _\
 * =`-(_)--(_)-'
 */
export interface Car {
  /** Unique monotonically-increasing identifier. */
  readonly id: number;
  readonly direction: Direction;
  readonly laneType: LaneType;
  /** Simulation time (ms) when the car joined the queue. */
  readonly arrivedAt: number;
  /**
   * Clearance progress: 0 = at stop line, 1 = fully cleared.
   * While `progress < 1` the car is in the intersection box.
   * Absent means the car is still queued (waiting).
   */
  readonly clearingProgress?: number;
  /** Simulation time (ms) when clearing started (for animation). */
  readonly clearingStartedAt?: number;
}

/** Create a new waiting car. */
export function createCar(
  id: number,
  direction: Direction,
  laneType: LaneType,
  arrivedAt: number,
): Car {
  return { id, direction, laneType, arrivedAt };
}

/** Start clearing the car through the intersection. */
export function startClearing(car: Car, now: number): Car {
  return { ...car, clearingProgress: 0, clearingStartedAt: now };
}

/** Advance clearing progress. Returns `null` when the car has fully cleared. */
export function advanceClearing(
  car: Car,
  deltaMs: number,
  clearanceDurationMs: number,
): Car | null {
  const prev = car.clearingProgress ?? 0;
  const next = prev + deltaMs / clearanceDurationMs;
  if (next >= 1) return null; // car has cleared
  return { ...car, clearingProgress: next };
}

/** True if the car is actively moving through the intersection box. */
export function isClearing(car: Car): boolean {
  return car.clearingProgress !== undefined && car.clearingProgress < 1;
}
