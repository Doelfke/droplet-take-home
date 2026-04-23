import { Direction, LaneType, DIRECTIONS, LANE_TYPES } from './signal';
import { Car } from './car';

// ---------------------------------------------------------------------------
// Lane
// ---------------------------------------------------------------------------

export interface Lane {
  readonly direction: Direction;
  readonly type: LaneType;
  /**
   * Ordered queue: head (index 0) = next car to depart.
   * Cars actively clearing the intersection box are NOT in this queue —
   * they live in `IntersectionState.clearing`.
   */
  readonly queue: readonly Car[];
}

export type Lanes = Readonly<Record<Direction, Readonly<Record<LaneType, Lane>>>>;

/** Build an empty lanes structure. */
export function createEmptyLanes(): Lanes {
  const result: Record<Direction, Record<LaneType, Lane>> = {} as never;
  for (const dir of DIRECTIONS) {
    result[dir] = {} as Record<LaneType, Lane>;
    for (const type of LANE_TYPES) {
      result[dir][type] = { direction: dir, type, queue: [] };
    }
  }
  return result as Lanes;
}

/** Return a new Lanes with the given car appended to the specified queue. */
export function enqueue(lanes: Lanes, dir: Direction, type: LaneType, car: Car): Lanes {
  const lane = lanes[dir][type];
  return replaceLane(lanes, dir, type, { ...lane, queue: [...lane.queue, car] });
}

/** Return a new Lanes with the head car removed from the specified queue. */
export function dequeue(lanes: Lanes, dir: Direction, type: LaneType): Lanes {
  const lane = lanes[dir][type];
  return replaceLane(lanes, dir, type, { ...lane, queue: lane.queue.slice(1) });
}

/** Return a new Lanes with an updated lane object. */
export function replaceLane(lanes: Lanes, dir: Direction, type: LaneType, lane: Lane): Lanes {
  return {
    ...lanes,
    [dir]: { ...lanes[dir], [type]: lane },
  };
}

/** Total number of waiting cars across all lanes (excludes clearing cars). */
export function totalWaiting(lanes: Lanes): number {
  let count = 0;
  for (const dir of DIRECTIONS) {
    for (const type of LANE_TYPES) {
      count += lanes[dir][type].queue.length;
    }
  }
  return count;
}

/** Number of waiting cars for a given direction (all lanes combined). */
export function waitingForDirection(lanes: Lanes, dir: Direction): number {
  return LANE_TYPES.reduce((sum, t) => sum + lanes[dir][t].queue.length, 0);
}
