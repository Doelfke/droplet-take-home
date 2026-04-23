/**
 * intersection.ts — Top-level intersection state machine.
 *
 * All state is immutable. `tick()` returns a new `IntersectionState`.
 * No DOM or React dependencies; pure TypeScript.
 */

import {
  IntersectionPhase,
  PHASE_TIMING,
  nextPhaseAfter,
  isSensorAdaptable,
  isTransitionPhase,
} from './phases';
import { Direction, LaneType, DIRECTIONS, LANE_TYPES, getSignals, canMove } from './signal';
import { Car, createCar, startClearing, advanceClearing } from './car';
import { Lanes, createEmptyLanes, enqueue, dequeue, waitingForDirection } from './lane';
import {
  PedestrianState,
  createPedestrianState,
  requestWalk as pedRequestWalk,
  consumeWalkRequests,
  hasWalkRequest,
} from './pedestrian';
import {
  RedDurations,
  createRedDurations,
  updateRedDurations,
  computePhaseDuration,
} from './sensor';
import { CAR_ARRIVAL_MEAN_MS, CAR_CLEARANCE_MS, CAR_DEPARTURE_STAGGER_MS } from '../constants';

// ---------------------------------------------------------------------------
// RNG interface (injectable for deterministic tests)
// ---------------------------------------------------------------------------

export type RngFn = () => number; // returns [0, 1)

export function defaultRng(): RngFn {
  return () => Math.random();
}

/** Simple seedable LCG for deterministic tests. */
export function seededRng(seed: number): RngFn {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Intersection state
// ---------------------------------------------------------------------------

export interface Stats {
  readonly carsServed: number;
  readonly totalWaitMs: number;
  readonly pedestrianClears: number;
}

export interface IntersectionState {
  readonly phase: IntersectionPhase;
  readonly phaseElapsed: number;
  /** Effective target duration for the current phase (sensor-adapted). */
  readonly phaseDuration: number;

  /** Flashing-orange animation toggle (true = lit). */
  readonly flashingOn: boolean;
  readonly flashingElapsed: number;

  readonly lanes: Lanes;
  /** Cars actively moving through the intersection box. */
  readonly clearing: readonly Car[];

  readonly pedestrian: PedestrianState;
  /** Phase to return to after PEDESTRIAN_CLEAR ends. */
  readonly resumePhase: IntersectionPhase;

  readonly redDurations: RedDurations;

  /** Monotonically-increasing car ID counter. */
  readonly nextCarId: number;
  /** Total simulation time elapsed (ms). */
  readonly time: number;

  readonly stats: Stats;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createIntersectionState(rng?: RngFn): IntersectionState {
  // Keep optional RNG in the signature for API compatibility.
  void rng;
  const phase = IntersectionPhase.NS_STRAIGHT;
  const emptyLanes = createEmptyLanes();
  return {
    phase,
    phaseElapsed: 0,
    phaseDuration: computePhaseDuration(phase, emptyLanes),
    flashingOn: true,
    flashingElapsed: 0,
    lanes: emptyLanes,
    clearing: [],
    pedestrian: createPedestrianState(),
    resumePhase: IntersectionPhase.NS_STRAIGHT,
    redDurations: createRedDurations(),
    nextCarId: 1,
    time: 0,
    stats: { carsServed: 0, totalWaitMs: 0, pedestrianClears: 0 },
  };
}

// ---------------------------------------------------------------------------
// Walk button
// ---------------------------------------------------------------------------

export function requestWalk(state: IntersectionState, direction: Direction): IntersectionState {
  return { ...state, pedestrian: pedRequestWalk(state.pedestrian, direction) };
}

// ---------------------------------------------------------------------------
// Car arrival (external trigger for testing)
// ---------------------------------------------------------------------------

export function notifyCarArrival(
  state: IntersectionState,
  direction: Direction,
  laneType: LaneType,
): IntersectionState {
  const car = createCar(state.nextCarId, direction, laneType, state.time);
  return {
    ...state,
    nextCarId: state.nextCarId + 1,
    lanes: enqueue(state.lanes, direction, laneType, car),
  };
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

/**
 * Advance the simulation by `deltaMs` milliseconds of simulation time.
 * Pass a `rng` function for deterministic testing.
 */
export function tick(
  state: IntersectionState,
  deltaMs: number,
  rng: RngFn = Math.random,
): IntersectionState {
  let s = state;

  s = advanceTime(s, deltaMs);
  s = tickFlashingOrange(s, deltaMs);
  s = tickArrivals(s, deltaMs, rng);
  s = tickClearingCars(s, deltaMs);
  s = tickDepartures(s, deltaMs);
  s = tickPhase(s, deltaMs);

  return s;
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

function advanceTime(s: IntersectionState, deltaMs: number): IntersectionState {
  return {
    ...s,
    time: s.time + deltaMs,
    phaseElapsed: s.phaseElapsed + deltaMs,
    redDurations: updateRedDurations(s.redDurations, s.phase, deltaMs),
  };
}

// ---------------------------------------------------------------------------
// Flashing orange
// ---------------------------------------------------------------------------

function tickFlashingOrange(s: IntersectionState, deltaMs: number): IntersectionState {
  const elapsed = s.flashingElapsed + deltaMs;
  const halfPeriod = 500; // ms
  const toggles = Math.floor(elapsed / halfPeriod);
  const newElapsed = elapsed % halfPeriod;
  const flashingOn = toggles % 2 === 0 ? s.flashingOn : !s.flashingOn;
  return { ...s, flashingOn, flashingElapsed: newElapsed };
}

// ---------------------------------------------------------------------------
// Car arrivals (Poisson-like using geometric inter-arrival)
// ---------------------------------------------------------------------------

function tickArrivals(s: IntersectionState, deltaMs: number, rng: RngFn): IntersectionState {
  let state = s;
  // Each lane independently: probability of arrival per tick ≈ deltaMs / MEAN
  const p = deltaMs / CAR_ARRIVAL_MEAN_MS;
  for (const dir of DIRECTIONS) {
    for (const type of LANE_TYPES) {
      if (rng() < p) {
        const car = createCar(state.nextCarId, dir, type, state.time);
        state = {
          ...state,
          nextCarId: state.nextCarId + 1,
          lanes: enqueue(state.lanes, dir, type, car),
        };
      }
    }
  }
  return state;
}

// ---------------------------------------------------------------------------
// Advance cars already in the intersection box
// ---------------------------------------------------------------------------

function tickClearingCars(s: IntersectionState, deltaMs: number): IntersectionState {
  let served = 0;
  let totalWait = 0;

  const stillClearing: Car[] = [];
  for (const car of s.clearing) {
    const updated = advanceClearing(car, deltaMs, CAR_CLEARANCE_MS);
    if (updated === null) {
      served++;
      totalWait += s.time - car.arrivedAt;
    } else {
      stillClearing.push(updated);
    }
  }

  return {
    ...s,
    clearing: stillClearing,
    stats: {
      ...s.stats,
      carsServed: s.stats.carsServed + served,
      totalWaitMs: s.stats.totalWaitMs + totalWait,
    },
  };
}

// ---------------------------------------------------------------------------
// Start departures from queues
// ---------------------------------------------------------------------------

function tickDepartures(s: IntersectionState, deltaMs: number): IntersectionState {
  const signals = getSignals(s.phase);
  let state = s;

  for (const dir of DIRECTIONS) {
    for (const type of LANE_TYPES) {
      const queue = state.lanes[dir][type].queue;
      if (queue.length === 0) continue;

      const car = queue[0];
      if (!car) continue;

      // Check oncoming conflict for flashing-orange left turns
      const hasConflict = type === 'left' ? hasOncomingConflict(state, dir) : false;

      if (!canMove(dir, type, signals, hasConflict, s.phase)) continue;

      // Stagger: only start a new departure if no car from this lane+direction
      // began clearing within the last STAGGER window
      if (recentlyStarted(state, dir, type, deltaMs)) continue;

      // Move head car to clearing
      const clearing = startClearing(car, state.time);
      state = {
        ...state,
        lanes: dequeue(state.lanes, dir, type),
        clearing: [...state.clearing, clearing],
      };
    }
  }

  return state;
}

function recentlyStarted(
  s: IntersectionState,
  dir: Direction,
  type: LaneType,
  deltaMs: number,
): boolean {
  return s.clearing.some(
    (c) =>
      c.direction === dir &&
      c.laneType === type &&
      c.clearingStartedAt !== undefined &&
      s.time - c.clearingStartedAt < CAR_DEPARTURE_STAGGER_MS - deltaMs,
  );
}

/**
 * A left-turning car has an oncoming conflict if the opposing straight queue
 * is non-empty OR if there are clearing cars coming from the opposite direction.
 */
function hasOncomingConflict(s: IntersectionState, turningDir: Direction): boolean {
  const oncoming = oppositeDirection(turningDir);
  const straightWaiting = waitingForDirection(s.lanes, oncoming) > 0;
  const straightClearing = s.clearing.some(
    (c) => c.direction === oncoming && (c.laneType === 'straight' || c.laneType === 'right'),
  );
  return straightWaiting || straightClearing;
}

function oppositeDirection(dir: Direction): Direction {
  const map: Record<Direction, Direction> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
  };
  return map[dir];
}

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

function tickPhase(s: IntersectionState, _deltaMs: number): IntersectionState {
  // Should we advance to the next phase?
  if (!shouldAdvancePhase(s)) return s;

  // Determine next phase
  const nextPhase = nextPhaseAfter(s.phase, s.resumePhase);

  // Pedestrian walk: inject PEDESTRIAN_CLEAR between a yellow→red boundary
  if (
    hasWalkRequest(s.pedestrian) &&
    isTransitionPhase(s.phase) &&
    nextPhase !== IntersectionPhase.PEDESTRIAN_CLEAR
  ) {
    const resumePhase = nextPhase;
    const newPed = consumeWalkRequests(s.pedestrian);
    return transitionTo(s, IntersectionPhase.PEDESTRIAN_CLEAR, { resumePhase, pedestrian: newPed });
  }

  return transitionTo(s, nextPhase, {});
}

function shouldAdvancePhase(s: IntersectionState): boolean {
  const timing = PHASE_TIMING[s.phase];
  if (isSensorAdaptable(s.phase)) {
    // Allow early exit if no cars are present on green approaches AND min elapsed
    if (s.phaseElapsed >= timing.minDuration && noGreenCarsPresent(s)) return true;
  }
  return s.phaseElapsed >= s.phaseDuration;
}

function noGreenCarsPresent(s: IntersectionState): boolean {
  const signals = getSignals(s.phase);
  for (const dir of DIRECTIONS) {
    const sig = signals[dir];
    if (sig.straight === 'green' || sig.left === 'green' || sig.left === 'flashingOrange') {
      if (waitingForDirection(s.lanes, dir) > 0) return false;
      if (s.clearing.some((c) => c.direction === dir)) return false;
    }
  }
  return true;
}

function transitionTo(
  s: IntersectionState,
  nextPhase: IntersectionPhase,
  overrides: Partial<IntersectionState>,
): IntersectionState {
  const newStats =
    nextPhase === IntersectionPhase.PEDESTRIAN_CLEAR
      ? { ...s.stats, pedestrianClears: s.stats.pedestrianClears + 1 }
      : s.stats;

  return {
    ...s,
    phase: nextPhase,
    phaseElapsed: 0,
    phaseDuration: computePhaseDuration(nextPhase, s.lanes),
    stats: newStats,
    ...overrides,
  };
}
