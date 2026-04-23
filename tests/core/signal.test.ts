import { describe, it, expect } from 'vitest';
import { getSignals, canMove, DIRECTIONS, LANE_TYPES } from '../../src/core/signal';
import { IntersectionPhase } from '../../src/core/phases';

// ---------------------------------------------------------------------------
// Safety invariant helpers
// ---------------------------------------------------------------------------

/** Returns all direction+lane pairs that have green or flashing-orange. */
function greenPairs(phase: IntersectionPhase) {
  const sigs = getSignals(phase);
  const pairs: string[] = [];
  for (const dir of DIRECTIONS) {
    const s = sigs[dir];
    if (s.straight === 'green' || s.straight === 'flashingOrange') pairs.push(`${dir}.straight`);
    if (s.left === 'green' || s.left === 'flashingOrange') pairs.push(`${dir}.left`);
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// getSignals
// ---------------------------------------------------------------------------

describe('getSignals – NS_STRAIGHT', () => {
  const sigs = getSignals(IntersectionPhase.NS_STRAIGHT);

  it('N/S straight is green', () => {
    expect(sigs.north.straight).toBe('green');
    expect(sigs.south.straight).toBe('green');
  });

  it('N/S left is flashingOrange', () => {
    expect(sigs.north.left).toBe('flashingOrange');
    expect(sigs.south.left).toBe('flashingOrange');
  });

  it('E/W is all red', () => {
    expect(sigs.east.straight).toBe('red');
    expect(sigs.east.left).toBe('red');
    expect(sigs.west.straight).toBe('red');
    expect(sigs.west.left).toBe('red');
  });
});

describe('getSignals – NS_LEFT', () => {
  const sigs = getSignals(IntersectionPhase.NS_LEFT);

  it('N/S left is green', () => {
    expect(sigs.north.left).toBe('green');
    expect(sigs.south.left).toBe('green');
  });

  it('N/S straight is red (safety: no conflicting greens)', () => {
    expect(sigs.north.straight).toBe('red');
    expect(sigs.south.straight).toBe('red');
  });

  it('E/W is all red', () => {
    expect(sigs.east.straight).toBe('red');
    expect(sigs.west.straight).toBe('red');
  });
});

describe('getSignals – PEDESTRIAN_CLEAR', () => {
  it('all directions are red', () => {
    const sigs = getSignals(IntersectionPhase.PEDESTRIAN_CLEAR);
    for (const dir of DIRECTIONS) {
      expect(sigs[dir].straight).toBe('red');
      expect(sigs[dir].left).toBe('red');
    }
  });
});

// ---------------------------------------------------------------------------
// Safety invariant: no conflicting greens
// ---------------------------------------------------------------------------

describe('safety invariant – no conflicting greens between N/S and E/W', () => {
  it('NS_STRAIGHT: E/W has no green', () => {
    const pairs = greenPairs(IntersectionPhase.NS_STRAIGHT);
    const ewGreen = pairs.filter((p) => p.startsWith('east') || p.startsWith('west'));
    expect(ewGreen).toHaveLength(0);
  });

  it('EW_STRAIGHT: N/S has no green', () => {
    const pairs = greenPairs(IntersectionPhase.EW_STRAIGHT);
    const nsGreen = pairs.filter((p) => p.startsWith('north') || p.startsWith('south'));
    expect(nsGreen).toHaveLength(0);
  });

  it('NS_LEFT: no E/W green AND no N/S straight green', () => {
    const sigs = getSignals(IntersectionPhase.NS_LEFT);
    expect(sigs.east.straight).toBe('red');
    expect(sigs.west.straight).toBe('red');
    expect(sigs.north.straight).toBe('red');
    expect(sigs.south.straight).toBe('red');
  });

  it('EW_LEFT: no N/S green AND no E/W straight green', () => {
    const sigs = getSignals(IntersectionPhase.EW_LEFT);
    expect(sigs.north.straight).toBe('red');
    expect(sigs.south.straight).toBe('red');
    expect(sigs.east.straight).toBe('red');
    expect(sigs.west.straight).toBe('red');
  });
});

// ---------------------------------------------------------------------------
// canMove
// ---------------------------------------------------------------------------

describe('canMove', () => {
  it('allows straight movement on green', () => {
    const sigs = getSignals(IntersectionPhase.NS_STRAIGHT);
    expect(canMove('north', 'straight', sigs, false)).toBe(true);
  });

  it('blocks straight movement on red', () => {
    const sigs = getSignals(IntersectionPhase.NS_STRAIGHT);
    expect(canMove('east', 'straight', sigs, false)).toBe(false);
  });

  it('allows left-turn on dedicated green', () => {
    const sigs = getSignals(IntersectionPhase.NS_LEFT);
    expect(canMove('north', 'left', sigs, false)).toBe(true);
    expect(canMove('north', 'left', sigs, true)).toBe(true); // dedicated green ignores oncoming
  });

  it('allows flashing-orange left turn with no oncoming conflict', () => {
    const sigs = getSignals(IntersectionPhase.NS_STRAIGHT);
    expect(canMove('north', 'left', sigs, false)).toBe(true);
  });

  it('blocks flashing-orange left turn with oncoming conflict', () => {
    const sigs = getSignals(IntersectionPhase.NS_STRAIGHT);
    expect(canMove('north', 'left', sigs, true)).toBe(false);
  });

  it('blocks left turn on red', () => {
    const sigs = getSignals(IntersectionPhase.EW_STRAIGHT);
    expect(canMove('north', 'left', sigs, false)).toBe(false);
  });

  it('allows right turn on green', () => {
    const sigs = getSignals(IntersectionPhase.NS_STRAIGHT);
    expect(canMove('north', 'right', sigs, false, IntersectionPhase.NS_STRAIGHT)).toBe(true);
  });

  it('allows right-on-red when cross traffic is stopped (NS_LEFT phase)', () => {
    // During NS_LEFT all straights are red, so E/W right-on-red is safe
    const sigs = getSignals(IntersectionPhase.NS_LEFT);
    expect(canMove('east', 'right', sigs, false, IntersectionPhase.NS_LEFT)).toBe(true);
    expect(canMove('west', 'right', sigs, false, IntersectionPhase.NS_LEFT)).toBe(true);
    expect(canMove('north', 'right', sigs, false, IntersectionPhase.NS_LEFT)).toBe(true);
    expect(canMove('south', 'right', sigs, false, IntersectionPhase.NS_LEFT)).toBe(true);
  });

  it('blocks right-on-red when cross traffic has green', () => {
    // During EW_STRAIGHT, east/west have green straight.
    // A northbound car turning right conflicts with westbound straight traffic.
    const sigs = getSignals(IntersectionPhase.EW_STRAIGHT);
    expect(canMove('north', 'right', sigs, false, IntersectionPhase.EW_STRAIGHT)).toBe(false);
    expect(canMove('south', 'right', sigs, false, IntersectionPhase.EW_STRAIGHT)).toBe(false);
  });

  it('blocks right-on-red during PEDESTRIAN_CLEAR', () => {
    const sigs = getSignals(IntersectionPhase.PEDESTRIAN_CLEAR);
    for (const dir of DIRECTIONS) {
      expect(canMove(dir, 'right', sigs, false, IntersectionPhase.PEDESTRIAN_CLEAR)).toBe(false);
    }
  });

  it('covers all lane types without throwing', () => {
    for (const phase of Object.values(IntersectionPhase)) {
      const sigs = getSignals(phase);
      for (const dir of DIRECTIONS) {
        for (const type of LANE_TYPES) {
          expect(() => canMove(dir, type, sigs, false, phase)).not.toThrow();
        }
      }
    }
  });
});
