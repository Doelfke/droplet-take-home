import { describe, it, expect } from 'vitest';
import {
  createPedestrianState,
  requestWalk,
  consumeWalkRequests,
  hasWalkRequest,
} from '../../src/core/pedestrian';

describe('createPedestrianState', () => {
  it('starts with no pending requests and clearQueued=false', () => {
    const p = createPedestrianState();
    expect(p.pendingDirections).toHaveLength(0);
    expect(p.clearQueued).toBe(false);
  });
});

describe('requestWalk', () => {
  it('adds a direction to pendingDirections', () => {
    const p = requestWalk(createPedestrianState(), 'north');
    expect(p.pendingDirections).toContain('north');
  });

  it('sets clearQueued to true', () => {
    const p = requestWalk(createPedestrianState(), 'south');
    expect(p.clearQueued).toBe(true);
  });

  it('does not duplicate the same direction', () => {
    let p = createPedestrianState();
    p = requestWalk(p, 'east');
    p = requestWalk(p, 'east');
    expect(p.pendingDirections.filter((d) => d === 'east')).toHaveLength(1);
  });

  it('allows multiple distinct directions', () => {
    let p = createPedestrianState();
    p = requestWalk(p, 'north');
    p = requestWalk(p, 'west');
    expect(p.pendingDirections).toHaveLength(2);
  });

  it('ignores invalid direction values', () => {
    const p = createPedestrianState();
    // @ts-expect-error intentional bad value
    const p2 = requestWalk(p, 'up');
    expect(p2.pendingDirections).toHaveLength(0);
    expect(p2.clearQueued).toBe(false);
  });
});

describe('consumeWalkRequests', () => {
  it('clears all pending directions', () => {
    let p = createPedestrianState();
    p = requestWalk(p, 'north');
    p = requestWalk(p, 'south');
    p = consumeWalkRequests(p);
    expect(p.pendingDirections).toHaveLength(0);
  });

  it('sets clearQueued to false', () => {
    let p = createPedestrianState();
    p = requestWalk(p, 'north');
    p = consumeWalkRequests(p);
    expect(p.clearQueued).toBe(false);
  });
});

describe('hasWalkRequest', () => {
  it('returns false initially', () => {
    expect(hasWalkRequest(createPedestrianState())).toBe(false);
  });

  it('returns true after a walk request', () => {
    const p = requestWalk(createPedestrianState(), 'east');
    expect(hasWalkRequest(p)).toBe(true);
  });

  it('returns false after consuming', () => {
    let p = createPedestrianState();
    p = requestWalk(p, 'north');
    p = consumeWalkRequests(p);
    expect(hasWalkRequest(p)).toBe(false);
  });
});
