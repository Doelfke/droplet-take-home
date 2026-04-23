import { describe, it, expect } from 'vitest';
import {
  createIntersectionState,
  tick,
  notifyCarArrival,
  defaultRng,
} from '../../src/core/intersection';
import { IntersectionPhase, PHASE_TIMING } from '../../src/core/phases';
import { replaceLane, enqueue } from '../../src/core/lane';
import { createCar, startClearing } from '../../src/core/car';

const noSpawnRng = () => 1;

describe('intersection coverage-focused scenarios', () => {
  it('defaultRng returns values in [0, 1)', () => {
    const rng = defaultRng();
    for (let i = 0; i < 20; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('early-advances adaptable green when no cars are present', () => {
    let s = createIntersectionState();
    s = {
      ...s,
      phase: IntersectionPhase.NS_STRAIGHT,
      phaseElapsed: PHASE_TIMING[IntersectionPhase.NS_STRAIGHT].minDuration + 1,
      phaseDuration: PHASE_TIMING[IntersectionPhase.NS_STRAIGHT].maxDuration,
      clearing: [],
    };

    s = tick(s, 0, noSpawnRng);
    expect(s.phase).toBe(IntersectionPhase.NS_YELLOW);
  });

  it('does not early-advance while a green-direction car is still clearing', () => {
    let s = createIntersectionState();
    s = notifyCarArrival(s, 'north', 'straight');

    // Move head car into clearing while suppressing additional arrivals.
    s = tick(s, 1, noSpawnRng);
    expect(s.clearing.length).toBeGreaterThan(0);

    s = {
      ...s,
      phase: IntersectionPhase.NS_STRAIGHT,
      phaseElapsed: PHASE_TIMING[IntersectionPhase.NS_STRAIGHT].minDuration + 1,
      phaseDuration: PHASE_TIMING[IntersectionPhase.NS_STRAIGHT].maxDuration,
    };

    s = tick(s, 0, noSpawnRng);
    expect(s.phase).toBe(IntersectionPhase.NS_STRAIGHT);
  });

  it('skips malformed lanes where queue[0] is undefined', () => {
    let s = createIntersectionState();
    const malformedLane = {
      ...s.lanes.north.straight,
      queue: [undefined as unknown as ReturnType<typeof createCar>],
    };
    s = { ...s, lanes: replaceLane(s.lanes, 'north', 'straight', malformedLane) };

    expect(() => tick(s, 1, noSpawnRng)).not.toThrow();
  });

  it('blocks permissive left turn when only oncoming clearing conflict exists', () => {
    const s = createIntersectionState();
    const lanesWithNorthLeft = enqueue(
      s.lanes,
      'north',
      'left',
      createCar(10, 'north', 'left', s.time),
    );
    const blockingCar = startClearing(createCar(11, 'south', 'straight', 0), 0);
    const state = {
      ...s,
      lanes: lanesWithNorthLeft,
      clearing: [blockingCar],
    };

    const next = tick(state, 0, noSpawnRng);
    expect(next.lanes.north.left.queue).toHaveLength(1);
  });
});
