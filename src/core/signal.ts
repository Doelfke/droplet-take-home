import { IntersectionPhase } from './phases';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Direction = 'north' | 'south' | 'east' | 'west';
export type LaneType = 'left' | 'straight' | 'right';
export type SignalColor = 'red' | 'yellow' | 'green' | 'flashingOrange';

export const DIRECTIONS: readonly Direction[] = ['north', 'south', 'east', 'west'];
export const LANE_TYPES: readonly LaneType[] = ['left', 'straight', 'right'];

export interface DirectionSignal {
  /** Signal for the straight + right lanes. */
  readonly straight: SignalColor;
  /** Signal for the dedicated left-turn lane. */
  readonly left: SignalColor;
}

export type IntersectionSignals = Readonly<Record<Direction, DirectionSignal>>;

// ---------------------------------------------------------------------------
// Signal map per phase
// ---------------------------------------------------------------------------

const RED_DIR: DirectionSignal = { straight: 'red', left: 'red' };
const GREEN_STRAIGHT: DirectionSignal = { straight: 'green', left: 'flashingOrange' };
const YELLOW_STRAIGHT: DirectionSignal = { straight: 'yellow', left: 'red' };
const GREEN_LEFT: DirectionSignal = { straight: 'red', left: 'green' };
const YELLOW_LEFT: DirectionSignal = { straight: 'red', left: 'yellow' };

const SIGNAL_MAP: Readonly<Record<IntersectionPhase, IntersectionSignals>> = {
  [IntersectionPhase.NS_STRAIGHT]: {
    north: GREEN_STRAIGHT,
    south: GREEN_STRAIGHT,
    east: RED_DIR,
    west: RED_DIR,
  },
  [IntersectionPhase.NS_YELLOW]: {
    north: YELLOW_STRAIGHT,
    south: YELLOW_STRAIGHT,
    east: RED_DIR,
    west: RED_DIR,
  },
  [IntersectionPhase.NS_LEFT]: {
    north: GREEN_LEFT,
    south: GREEN_LEFT,
    east: RED_DIR,
    west: RED_DIR,
  },
  [IntersectionPhase.NS_LEFT_YELLOW]: {
    north: YELLOW_LEFT,
    south: YELLOW_LEFT,
    east: RED_DIR,
    west: RED_DIR,
  },
  [IntersectionPhase.EW_STRAIGHT]: {
    east: GREEN_STRAIGHT,
    west: GREEN_STRAIGHT,
    north: RED_DIR,
    south: RED_DIR,
  },
  [IntersectionPhase.EW_YELLOW]: {
    east: YELLOW_STRAIGHT,
    west: YELLOW_STRAIGHT,
    north: RED_DIR,
    south: RED_DIR,
  },
  [IntersectionPhase.EW_LEFT]: {
    east: GREEN_LEFT,
    west: GREEN_LEFT,
    north: RED_DIR,
    south: RED_DIR,
  },
  [IntersectionPhase.EW_LEFT_YELLOW]: {
    east: YELLOW_LEFT,
    west: YELLOW_LEFT,
    north: RED_DIR,
    south: RED_DIR,
  },
  [IntersectionPhase.PEDESTRIAN_CLEAR]: {
    north: RED_DIR,
    south: RED_DIR,
    east: RED_DIR,
    west: RED_DIR,
  },
};

/**
 * Returns the static signal colors for the given phase.
 * Flashing-orange toggling is handled separately in the renderer.
 */
export function getSignals(phase: IntersectionPhase): IntersectionSignals {
  return SIGNAL_MAP[phase];
}

// ---------------------------------------------------------------------------
// Movement permission
// ---------------------------------------------------------------------------

// Maps each direction to the cross-traffic direction that conflicts with a right turn.
// e.g. a northbound car turning right (east) must yield to westbound straight traffic.
const RIGHT_TURN_CONFLICT: Record<Direction, Direction> = {
  north: 'west',
  south: 'east',
  east: 'north',
  west: 'south',
};

/**
 * Returns true if a car in the given direction + lane can begin moving.
 *
 * For flashing-orange left turns the caller must supply whether oncoming
 * traffic is present; if it is, the car must wait.
 *
 * Pass `phase` so right-on-red can be blocked during PEDESTRIAN_CLEAR.
 */
export function canMove(
  direction: Direction,
  laneType: LaneType,
  signals: IntersectionSignals,
  hasOncomingConflict: boolean,
  phase?: IntersectionPhase,
): boolean {
  const sig = signals[direction];
  switch (laneType) {
    case 'straight':
      return sig.straight === 'green';
    case 'right': {
      if (sig.straight === 'green') return true;
      // Right-on-red: blocked during pedestrian clear and when cross traffic has green or yellow.
      if (phase === IntersectionPhase.PEDESTRIAN_CLEAR) return false;
      const crossStraight = signals[RIGHT_TURN_CONFLICT[direction]].straight;
      return crossStraight !== 'green' && crossStraight !== 'yellow';
    }
    case 'left':
      if (sig.left === 'green') return true;
      if (sig.left === 'flashingOrange') return !hasOncomingConflict;
      return false;
  }
}
