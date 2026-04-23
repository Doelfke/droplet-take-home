import { describe, it, expect } from 'vitest';
import {
  IntersectionPhase,
  PHASE_TIMING,
  PHASE_SEQUENCE,
  nextPhaseAfter,
  isSensorAdaptable,
  isTransitionPhase,
} from '../../src/core/phases';

describe('PHASE_TIMING', () => {
  it('covers every phase', () => {
    for (const phase of Object.values(IntersectionPhase)) {
      expect(PHASE_TIMING[phase]).toBeDefined();
    }
  });

  it('fixed phases have equal min and max durations', () => {
    const fixedPhases = Object.values(IntersectionPhase).filter((p) => PHASE_TIMING[p].fixed);
    for (const phase of fixedPhases) {
      const t = PHASE_TIMING[phase];
      expect(t.minDuration).toBe(t.maxDuration);
    }
  });

  it('adaptable phases have minDuration < maxDuration', () => {
    const adaptable = Object.values(IntersectionPhase).filter((p) => !PHASE_TIMING[p].fixed);
    for (const phase of adaptable) {
      const t = PHASE_TIMING[phase];
      expect(t.minDuration).toBeLessThan(t.maxDuration);
    }
  });
});

describe('PHASE_SEQUENCE', () => {
  it('starts with NS_STRAIGHT', () => {
    expect(PHASE_SEQUENCE[0]).toBe(IntersectionPhase.NS_STRAIGHT);
  });

  it('has 8 phases (no PEDESTRIAN_CLEAR)', () => {
    expect(PHASE_SEQUENCE).toHaveLength(8);
    expect(PHASE_SEQUENCE).not.toContain(IntersectionPhase.PEDESTRIAN_CLEAR);
  });
});

describe('nextPhaseAfter', () => {
  it('cycles from NS_STRAIGHT through to EW_LEFT_YELLOW then back to NS_STRAIGHT', () => {
    let phase = IntersectionPhase.NS_STRAIGHT;
    const visited: IntersectionPhase[] = [phase];
    for (let i = 0; i < 8; i++) {
      phase = nextPhaseAfter(phase);
      visited.push(phase);
    }
    expect(visited[visited.length - 1]).toBe(IntersectionPhase.NS_STRAIGHT);
    expect(new Set(visited.slice(0, 8)).size).toBe(8); // all 8 unique phases visited
  });

  it('returns resumePhase when current is PEDESTRIAN_CLEAR', () => {
    const resume = IntersectionPhase.EW_STRAIGHT;
    expect(nextPhaseAfter(IntersectionPhase.PEDESTRIAN_CLEAR, resume)).toBe(resume);
  });

  it('defaults to NS_STRAIGHT if no resumePhase given after PEDESTRIAN_CLEAR', () => {
    expect(nextPhaseAfter(IntersectionPhase.PEDESTRIAN_CLEAR)).toBe(IntersectionPhase.NS_STRAIGHT);
  });

  it('falls back to NS_STRAIGHT for unknown phase values', () => {
    expect(nextPhaseAfter('UNKNOWN_PHASE' as IntersectionPhase)).toBe(
      IntersectionPhase.NS_STRAIGHT,
    );
  });
});

describe('isSensorAdaptable', () => {
  it('returns false for yellow and pedestrian phases', () => {
    const nonAdaptable = [
      IntersectionPhase.NS_YELLOW,
      IntersectionPhase.NS_LEFT_YELLOW,
      IntersectionPhase.EW_YELLOW,
      IntersectionPhase.EW_LEFT_YELLOW,
      IntersectionPhase.PEDESTRIAN_CLEAR,
    ];
    for (const p of nonAdaptable) {
      expect(isSensorAdaptable(p)).toBe(false);
    }
  });

  it('returns true for green phases', () => {
    const adaptable = [
      IntersectionPhase.NS_STRAIGHT,
      IntersectionPhase.NS_LEFT,
      IntersectionPhase.EW_STRAIGHT,
      IntersectionPhase.EW_LEFT,
    ];
    for (const p of adaptable) {
      expect(isSensorAdaptable(p)).toBe(true);
    }
  });
});

describe('isTransitionPhase', () => {
  it('identifies transition phases', () => {
    expect(isTransitionPhase(IntersectionPhase.NS_YELLOW)).toBe(true);
    expect(isTransitionPhase(IntersectionPhase.EW_LEFT_YELLOW)).toBe(true);
    expect(isTransitionPhase(IntersectionPhase.PEDESTRIAN_CLEAR)).toBe(true);
  });

  it('returns false for non-transition phases', () => {
    expect(isTransitionPhase(IntersectionPhase.NS_STRAIGHT)).toBe(false);
    expect(isTransitionPhase(IntersectionPhase.EW_LEFT)).toBe(false);
  });
});
