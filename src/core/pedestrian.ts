import { Direction, DIRECTIONS } from './signal';

// ---------------------------------------------------------------------------
// Pedestrian state
// ---------------------------------------------------------------------------

export interface PedestrianState {
  /**
   * Walk requests that have been received but not yet served.
   * Using a plain array (ordered) for immutability-friendly updates.
   */
  readonly pendingDirections: readonly Direction[];
  /** True when a pedestrian clear phase is scheduled for the next yellow→red. */
  readonly clearQueued: boolean;
}

export function createPedestrianState(): PedestrianState {
  return { pendingDirections: [], clearQueued: false };
}

/**
 * Register a walk-button press for the given direction.
 * Validates the direction against the enum to prevent invalid input.
 * Debounces duplicate requests (already pending).
 */
export function requestWalk(state: PedestrianState, direction: Direction): PedestrianState {
  // Validate direction is in the allowed set
  if (!DIRECTIONS.includes(direction)) return state;
  if (state.pendingDirections.includes(direction)) return state;
  return {
    ...state,
    pendingDirections: [...state.pendingDirections, direction],
    clearQueued: true,
  };
}

/** Mark the pedestrian clear as consumed (e.g. when entering PEDESTRIAN_CLEAR phase). */
export function consumeWalkRequests(_state: PedestrianState): PedestrianState {
  return { pendingDirections: [], clearQueued: false };
}

/** True if any walk request is pending. */
export function hasWalkRequest(state: PedestrianState): boolean {
  return state.clearQueued;
}
