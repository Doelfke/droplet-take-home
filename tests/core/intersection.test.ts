import { describe, it, expect } from 'vitest';
import {
  createIntersectionState,
  tick,
  requestWalk,
  notifyCarArrival,
  seededRng,
  IntersectionState,
} from '../../src/core/intersection';
import { IntersectionPhase, PHASE_TIMING } from '../../src/core/phases';
import { getSignals, DIRECTIONS, LANE_TYPES } from '../../src/core/signal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** RNG that never spawns new cars (returns 0 always). */
const noArrivalRng = () => 0;

/** Advance simulation by `ms` in one tick with no arrivals. */
function advance(state: IntersectionState, ms: number): IntersectionState {
  return tick(state, ms, noArrivalRng);
}

/** Advance simulation enough to complete a full phase cycle. */
function advanceThrough(state: IntersectionState, phase: IntersectionPhase): IntersectionState {
  const max = PHASE_TIMING[phase].maxDuration;
  return advance(state, max + 1);
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('createIntersectionState', () => {
  it('starts in NS_STRAIGHT', () => {
    expect(createIntersectionState().phase).toBe(IntersectionPhase.NS_STRAIGHT);
  });

  it('has zero cars and zero stats', () => {
    const s = createIntersectionState();
    expect(s.clearing).toHaveLength(0);
    expect(s.stats.carsServed).toBe(0);
    for (const dir of DIRECTIONS) {
      for (const type of LANE_TYPES) {
        expect(s.lanes[dir][type].queue).toHaveLength(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

describe('phase transitions', () => {
  it('NS_STRAIGHT → NS_YELLOW after max duration', () => {
    let s = createIntersectionState();
    s = advanceThrough(s, IntersectionPhase.NS_STRAIGHT);
    expect(s.phase).toBe(IntersectionPhase.NS_YELLOW);
  });

  it('completes the full 8-phase cycle', () => {
    let s = createIntersectionState();
    const expectedCycle = [
      IntersectionPhase.NS_STRAIGHT,
      IntersectionPhase.NS_YELLOW,
      IntersectionPhase.NS_LEFT,
      IntersectionPhase.NS_LEFT_YELLOW,
      IntersectionPhase.EW_STRAIGHT,
      IntersectionPhase.EW_YELLOW,
      IntersectionPhase.EW_LEFT,
      IntersectionPhase.EW_LEFT_YELLOW,
      IntersectionPhase.NS_STRAIGHT, // back to start
    ];

    for (const expectedPhase of expectedCycle.slice(1)) {
      s = advanceThrough(s, s.phase);
      expect(s.phase).toBe(expectedPhase);
    }
  });

  it('sensor shortens phase when no cars are present after minDuration', () => {
    let s = createIntersectionState();
    // Advance just past minimum duration (10000ms) with no cars
    s = advance(s, PHASE_TIMING[IntersectionPhase.NS_STRAIGHT].minDuration + 1);
    expect(s.phase).toBe(IntersectionPhase.NS_YELLOW);
  });

  it('phase resets phaseElapsed to 0 on transition', () => {
    let s = createIntersectionState();
    s = advanceThrough(s, s.phase);
    expect(s.phaseElapsed).toBeLessThan(PHASE_TIMING[IntersectionPhase.NS_YELLOW].minDuration);
  });
});

// ---------------------------------------------------------------------------
// Safety invariant: no conflicting greens
// ---------------------------------------------------------------------------

describe('safety invariant – no conflicting greens at any point', () => {
  it('holds over a full phase cycle with active traffic', () => {
    let s = createIntersectionState();
    // Pre-seed with cars in all directions
    for (const dir of DIRECTIONS) {
      for (const type of LANE_TYPES) {
        s = notifyCarArrival(s, dir, type);
      }
    }

    // Simulate 5 full cycles
    const rng = seededRng(42);
    for (let i = 0; i < 5; i++) {
      for (let ms = 0; ms < 200_000; ms += 100) {
        s = tick(s, 100, rng);

        // At every tick, verify no conflicting greens
        const sigs = getSignals(s.phase);
        const nsGreen =
          sigs.north.straight === 'green' ||
          sigs.south.straight === 'green' ||
          sigs.north.left === 'green' ||
          sigs.south.left === 'green';
        const ewGreen =
          sigs.east.straight === 'green' ||
          sigs.west.straight === 'green' ||
          sigs.east.left === 'green' ||
          sigs.west.left === 'green';

        expect(nsGreen && ewGreen).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Car arrival & departure
// ---------------------------------------------------------------------------

describe('car arrival and departure', () => {
  it('notifyCarArrival adds a car to the correct queue', () => {
    const s = notifyCarArrival(createIntersectionState(), 'north', 'straight');
    expect(s.lanes.north.straight.queue).toHaveLength(1);
  });

  it('increments nextCarId', () => {
    let s = createIntersectionState();
    s = notifyCarArrival(s, 'north', 'straight');
    s = notifyCarArrival(s, 'north', 'straight');
    expect(s.nextCarId).toBe(3);
  });

  it('cars depart during green phase', () => {
    let s = createIntersectionState();
    // Add cars to north straight (will be green in NS_STRAIGHT)
    for (let i = 0; i < 3; i++) {
      s = notifyCarArrival(s, 'north', 'straight');
    }
    // Advance enough ticks for cars to start clearing
    for (let i = 0; i < 50; i++) {
      s = advance(s, 100);
      if (s.clearing.length > 0) break;
    }
    expect(s.clearing.length).toBeGreaterThan(0);
  });

  it('cars do not depart on red', () => {
    let s = createIntersectionState();
    // Add cars to east straight (red during NS_STRAIGHT)
    for (let i = 0; i < 3; i++) {
      s = notifyCarArrival(s, 'east', 'straight');
    }
    // Advance for 5 seconds (still NS_STRAIGHT with sensor if cars are present)
    for (let i = 0; i < 50; i++) {
      s = advance(s, 100);
    }
    expect(s.clearing.filter((c) => c.direction === 'east')).toHaveLength(0);
  });

  it('stats increment as cars clear', () => {
    let s = createIntersectionState();
    for (let i = 0; i < 5; i++) {
      s = notifyCarArrival(s, 'north', 'straight');
    }
    // Advance well past clearance time
    for (let i = 0; i < 500; i++) {
      s = advance(s, 50);
    }
    expect(s.stats.carsServed).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Walk button / pedestrian clear
// ---------------------------------------------------------------------------

describe('pedestrian walk', () => {
  it('requestWalk sets clearQueued flag', () => {
    const s = requestWalk(createIntersectionState(), 'north');
    expect(s.pedestrian.clearQueued).toBe(true);
  });

  it('debounces duplicate walk requests for the same direction', () => {
    let s = createIntersectionState();
    s = requestWalk(s, 'north');
    s = requestWalk(s, 'north');
    expect(s.pedestrian.pendingDirections.filter((d) => d === 'north')).toHaveLength(1);
  });

  it('accepts walk requests for multiple different directions', () => {
    let s = createIntersectionState();
    s = requestWalk(s, 'north');
    s = requestWalk(s, 'east');
    expect(s.pedestrian.pendingDirections).toHaveLength(2);
  });

  it('transitions to PEDESTRIAN_CLEAR after a yellow phase', () => {
    let s = createIntersectionState();
    s = requestWalk(s, 'north');

    // Drive to NS_YELLOW
    s = advanceThrough(s, IntersectionPhase.NS_STRAIGHT);
    expect(s.phase).toBe(IntersectionPhase.NS_YELLOW);

    // Drive through yellow → should inject PEDESTRIAN_CLEAR
    s = advanceThrough(s, IntersectionPhase.NS_YELLOW);
    expect(s.phase).toBe(IntersectionPhase.PEDESTRIAN_CLEAR);
  });

  it('increments pedestrianClears stat', () => {
    let s = createIntersectionState();
    s = requestWalk(s, 'north');
    s = advanceThrough(s, IntersectionPhase.NS_STRAIGHT);
    s = advanceThrough(s, IntersectionPhase.NS_YELLOW);
    expect(s.stats.pedestrianClears).toBe(1);
  });

  it('returns to normal cycle after PEDESTRIAN_CLEAR', () => {
    let s = createIntersectionState();
    s = requestWalk(s, 'south');
    s = advanceThrough(s, IntersectionPhase.NS_STRAIGHT);
    s = advanceThrough(s, IntersectionPhase.NS_YELLOW);
    expect(s.phase).toBe(IntersectionPhase.PEDESTRIAN_CLEAR);
    s = advanceThrough(s, IntersectionPhase.PEDESTRIAN_CLEAR);
    // Should resume the next normal phase
    expect(s.phase).not.toBe(IntersectionPhase.PEDESTRIAN_CLEAR);
  });

  it('ignores invalid direction strings gracefully', () => {
    const s = createIntersectionState();
    // @ts-expect-error intentional invalid value
    const s2 = requestWalk(s, 'northeast');
    expect(s2.pedestrian.clearQueued).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Opposite-pair left-turn safety
// ---------------------------------------------------------------------------

describe('opposite-pair left-turn', () => {
  it('N/S left turns are green at the same time in NS_LEFT', () => {
    const sigs = getSignals(IntersectionPhase.NS_LEFT);
    expect(sigs.north.left).toBe('green');
    expect(sigs.south.left).toBe('green');
  });

  it('straight lights are red during NS_LEFT', () => {
    const sigs = getSignals(IntersectionPhase.NS_LEFT);
    expect(sigs.north.straight).toBe('red');
    expect(sigs.south.straight).toBe('red');
  });

  it('E/W left turns are green at the same time in EW_LEFT', () => {
    const sigs = getSignals(IntersectionPhase.EW_LEFT);
    expect(sigs.east.left).toBe('green');
    expect(sigs.west.left).toBe('green');
  });
});

// ---------------------------------------------------------------------------
// Flashing orange
// ---------------------------------------------------------------------------

describe('flashing orange', () => {
  it('toggles at ~500ms intervals', () => {
    let s = createIntersectionState();
    const initial = s.flashingOn;
    s = advance(s, 501);
    expect(s.flashingOn).not.toBe(initial);
    s = advance(s, 501);
    expect(s.flashingOn).toBe(initial);
  });
});
