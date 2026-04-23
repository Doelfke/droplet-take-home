import { describe, it, expect } from 'vitest';
import {
  createRedDurations,
  updateRedDurations,
  computePhaseDuration,
  isStarving,
  phaseForDirection,
} from '../../src/core/sensor';
import { IntersectionPhase, PHASE_TIMING } from '../../src/core/phases';
import { createEmptyLanes, enqueue } from '../../src/core/lane';
import { createCar } from '../../src/core/car';
import { STARVATION_THRESHOLD_MS } from '../../src/constants';

// ---------------------------------------------------------------------------
// createRedDurations
// ---------------------------------------------------------------------------

describe('createRedDurations', () => {
  it('initialises all directions to 0', () => {
    const rd = createRedDurations();
    expect(rd.north).toBe(0);
    expect(rd.south).toBe(0);
    expect(rd.east).toBe(0);
    expect(rd.west).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// updateRedDurations
// ---------------------------------------------------------------------------

describe('updateRedDurations', () => {
  it('increments red directions and resets green directions', () => {
    const rd = createRedDurations();
    // During NS_STRAIGHT, north+south are green; east+west are red
    const updated = updateRedDurations(rd, IntersectionPhase.NS_STRAIGHT, 1000);
    expect(updated.north).toBe(0);
    expect(updated.south).toBe(0);
    expect(updated.east).toBe(1000);
    expect(updated.west).toBe(1000);
  });

  it('resets to 0 when a direction becomes green', () => {
    const rd = { north: 5000, south: 5000, east: 8000, west: 8000 };
    const updated = updateRedDurations(rd, IntersectionPhase.EW_STRAIGHT, 1000);
    expect(updated.east).toBe(0);
    expect(updated.west).toBe(0);
    expect(updated.north).toBe(6000);
    expect(updated.south).toBe(6000);
  });

  it('all directions stay red during PEDESTRIAN_CLEAR', () => {
    const rd = { north: 1000, south: 1000, east: 1000, west: 1000 };
    const updated = updateRedDurations(rd, IntersectionPhase.PEDESTRIAN_CLEAR, 5000);
    expect(updated.north).toBe(6000);
    expect(updated.east).toBe(6000);
  });

  it('treats missing direction counters as 0 via defensive fallback', () => {
    const malformed = { north: 10, south: 20 } as Record<
      'north' | 'south' | 'east' | 'west',
      number
    >;
    const updated = updateRedDurations(malformed, IntersectionPhase.NS_STRAIGHT, 5);
    expect(updated.east).toBe(5);
    expect(updated.west).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// computePhaseDuration
// ---------------------------------------------------------------------------

describe('computePhaseDuration', () => {
  it('returns minDuration for fixed phases regardless of traffic', () => {
    const lanes = createEmptyLanes();
    expect(computePhaseDuration(IntersectionPhase.NS_YELLOW, lanes)).toBe(
      PHASE_TIMING[IntersectionPhase.NS_YELLOW].minDuration,
    );
  });

  it('returns minDuration for empty approaches', () => {
    const lanes = createEmptyLanes();
    const dur = computePhaseDuration(IntersectionPhase.NS_STRAIGHT, lanes);
    expect(dur).toBe(PHASE_TIMING[IntersectionPhase.NS_STRAIGHT].minDuration);
  });

  it('extends duration when cars are waiting (up to maxDuration)', () => {
    let lanes = createEmptyLanes();
    // Add 10 cars to north straight
    for (let i = 0; i < 10; i++) {
      lanes = enqueue(lanes, 'north', 'straight', createCar(i, 'north', 'straight', 0));
    }
    const dur = computePhaseDuration(IntersectionPhase.NS_STRAIGHT, lanes);
    expect(dur).toBeGreaterThan(PHASE_TIMING[IntersectionPhase.NS_STRAIGHT].minDuration);
    expect(dur).toBeLessThanOrEqual(PHASE_TIMING[IntersectionPhase.NS_STRAIGHT].maxDuration);
  });

  it('caps at maxDuration even with many cars', () => {
    let lanes = createEmptyLanes();
    // Add 1000 cars
    for (let i = 0; i < 1000; i++) {
      lanes = enqueue(lanes, 'north', 'straight', createCar(i, 'north', 'straight', 0));
    }
    const dur = computePhaseDuration(IntersectionPhase.NS_STRAIGHT, lanes);
    expect(dur).toBe(PHASE_TIMING[IntersectionPhase.NS_STRAIGHT].maxDuration);
  });
});

// ---------------------------------------------------------------------------
// isStarving
// ---------------------------------------------------------------------------

describe('isStarving', () => {
  it('returns false when below threshold', () => {
    const rd = { ...createRedDurations(), north: STARVATION_THRESHOLD_MS - 1 };
    expect(isStarving(rd, 'north')).toBe(false);
  });

  it('returns true when at or above threshold', () => {
    const rd = { ...createRedDurations(), north: STARVATION_THRESHOLD_MS };
    expect(isStarving(rd, 'north')).toBe(true);
  });

  it('treats missing direction entries as 0 via defensive fallback', () => {
    const malformed = { north: STARVATION_THRESHOLD_MS } as Record<
      'north' | 'south' | 'east' | 'west',
      number
    >;
    expect(isStarving(malformed, 'east')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// phaseForDirection
// ---------------------------------------------------------------------------

describe('phaseForDirection', () => {
  it('maps N/S to NS_STRAIGHT', () => {
    expect(phaseForDirection('north')).toBe(IntersectionPhase.NS_STRAIGHT);
    expect(phaseForDirection('south')).toBe(IntersectionPhase.NS_STRAIGHT);
  });

  it('maps E/W to EW_STRAIGHT', () => {
    expect(phaseForDirection('east')).toBe(IntersectionPhase.EW_STRAIGHT);
    expect(phaseForDirection('west')).toBe(IntersectionPhase.EW_STRAIGHT);
  });
});
