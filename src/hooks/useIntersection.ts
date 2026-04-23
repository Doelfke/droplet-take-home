/**
 * useIntersection.ts
 * React hook that owns the requestAnimationFrame loop and bridges
 * the pure IntersectionState into React state.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  IntersectionState,
  createIntersectionState,
  tick,
  requestWalk,
  defaultRng,
} from '../core/intersection';
import { Direction } from '../core/signal';

export interface UseIntersectionResult {
  state: IntersectionState;
  speedMultiplier: number;
  setSpeedMultiplier: (v: number) => void;
  handleWalk: (dir: Direction) => void;
  paused: boolean;
  setPaused: (v: boolean) => void;
}

export function useIntersection(): UseIntersectionResult {
  const [state, setState] = useState<IntersectionState>(() => createIntersectionState());
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [paused, setPaused] = useState<boolean>(false);

  // Use refs to avoid stale closures in rAF callback
  const stateRef = useRef<IntersectionState>(state);
  const speedRef = useRef<number>(speedMultiplier);
  const pausedRef = useRef<boolean>(paused);
  const rng = useRef(defaultRng());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const lastTimestampRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function loop(timestamp: number) {
      rafRef.current = requestAnimationFrame(loop);

      if (pausedRef.current) {
        lastTimestampRef.current = null;
        return;
      }

      const prev = lastTimestampRef.current;
      lastTimestampRef.current = timestamp;
      if (prev === null) return; // first frame – skip to establish baseline

      const realDelta = Math.min(timestamp - prev, 200); // cap at 200 ms to avoid spirals
      const simDelta = realDelta * speedRef.current;

      stateRef.current = tick(stateRef.current, simDelta, rng.current);
      setState(stateRef.current);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []); // intentionally empty – loop uses refs

  const handleWalk = useCallback((dir: Direction) => {
    stateRef.current = requestWalk(stateRef.current, dir);
    setState(stateRef.current);
  }, []);

  return { state, speedMultiplier, setSpeedMultiplier, handleWalk, paused, setPaused };
}
