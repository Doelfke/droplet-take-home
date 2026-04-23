/**
 * CarRenderer.ts
 * Draws cars in their queued and clearing states on the canvas.
 *
 * ASCII art illustration of a car (task requirement):
 *
 *        ______
 *       /|_||_\`.__
 *      (   _    _ _\
 *      =`-(_)--(_)-'
 *
 */

import { Car, isClearing } from '../core/car';
import { Direction, LaneType } from '../core/signal';
import {
  CENTER_X,
  CENTER_Y,
  LANE_W,
  ROAD_HALF,
  BOX_LEFT,
  BOX_RIGHT,
  BOX_TOP,
  BOX_BOTTOM,
  CAR_W,
  CAR_H,
} from '../constants';

// ---------------------------------------------------------------------------
// Car colours by direction
// ---------------------------------------------------------------------------

const DIR_COLORS: Record<Direction, string> = {
  north: '#4aa8ff',
  south: '#ff7a4a',
  east: '#7aff7a',
  west: '#ff7aff',
};

// ---------------------------------------------------------------------------
// Lane index → offset within road half
// ---------------------------------------------------------------------------

/** Lane order per direction (0=left-turn, 1=straight, 2=straight, 3=right-turn). */
const LANE_ORDER: Record<LaneType, number[]> = {
  left: [0],
  straight: [1, 2],
  right: [3],
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Lane centre X for a lane in the North or South arm (N-S road). */
function laneX_NS(dir: Direction, laneType: LaneType, laneIndex = 0): number {
  const order = LANE_ORDER[laneType][laneIndex] ?? LANE_ORDER[laneType][0] ?? 0;
  if (dir === 'north') {
    // Southbound: west half of N-S road (BOX_LEFT .. CENTER_X).
    // Lane 0 = left-turn = innermost (closest to centre line = CENTER_X side).
    // Reverse the physical index so order 0 lands at the inner lane.
    return BOX_LEFT + (3 - order) * LANE_W + LANE_W / 2;
  } else {
    // Northbound: east half of N-S road (CENTER_X .. BOX_RIGHT).
    // Lane 0 = left-turn = innermost (closest to centre line = CENTER_X side). Correct as-is.
    return CENTER_X + order * LANE_W + LANE_W / 2;
  }
}

/** Lane centre Y for a lane in the East or West arm (E-W road). */
function laneY_EW(dir: Direction, laneType: LaneType, laneIndex = 0): number {
  const order = LANE_ORDER[laneType][laneIndex] ?? LANE_ORDER[laneType][0] ?? 0;
  if (dir === 'west') {
    // Eastbound: south half of E-W road (CENTER_Y .. BOX_BOTTOM).
    // Lane 0 = left-turn = innermost (closest to centre line = CENTER_Y side). Correct as-is.
    return CENTER_Y + order * LANE_W + LANE_W / 2;
  } else {
    // Westbound: north half of E-W road (BOX_TOP .. CENTER_Y).
    // Lane 0 = left-turn = innermost (closest to centre line = CENTER_Y side).
    // Reverse the physical index so order 0 lands at the inner (south) lane.
    return BOX_TOP + (3 - order) * LANE_W + LANE_W / 2;
  }
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/** Heading angle (radians) for a car facing its travel direction. */
const DIR_ANGLES: Record<Direction, number> = {
  north: Math.PI / 2, // heading south on canvas
  south: -Math.PI / 2, // heading north on canvas
  west: 0, // heading right
  east: Math.PI, // heading left
};

export function drawCars(
  ctx: CanvasRenderingContext2D,
  queued: ReadonlyMap<string, readonly Car[]>,
  clearing: readonly Car[],
): void {
  // Draw queued cars (behind stop line)
  queued.forEach((queue, key) => {
    const [dir, type] = key.split(':') as [Direction, LaneType];
    queue.forEach((car, idx) => {
      const pos = getQueuedCarPosition(dir, type, idx);
      drawCar(ctx, pos.x, pos.y, DIR_ANGLES[dir], car);
    });
  });

  // Draw clearing cars (in intersection box or exiting)
  for (const car of clearing) {
    if (!isClearing(car)) continue;
    const pos = getClearingCarPosition(car);
    drawCar(ctx, pos.x, pos.y, pos.angle, car);
  }
}

// ---------------------------------------------------------------------------
// Queued car positions
// ---------------------------------------------------------------------------

function getQueuedCarPosition(
  dir: Direction,
  type: LaneType,
  queueIndex: number,
): { x: number; y: number } {
  const gap = CAR_H + 4; // spacing between cars in queue

  switch (dir) {
    case 'north': {
      const cx = laneX_NS('north', type);
      const stopY = BOX_TOP; // stop line
      const y = stopY - CAR_H / 2 - 4 - queueIndex * gap;
      return { x: cx, y };
    }
    case 'south': {
      const cx = laneX_NS('south', type);
      const stopY = BOX_BOTTOM;
      const y = stopY + CAR_H / 2 + 4 + queueIndex * gap;
      return { x: cx, y };
    }
    case 'west': {
      const cy = laneY_EW('west', type);
      const stopX = BOX_LEFT;
      const x = stopX - CAR_W / 2 - 4 - queueIndex * gap;
      return { x, y: cy };
    }
    case 'east': {
      const cy = laneY_EW('east', type);
      const stopX = BOX_RIGHT;
      const x = stopX + CAR_W / 2 + 4 + queueIndex * gap;
      return { x, y: cy };
    }
  }
}

// ---------------------------------------------------------------------------
// Bezier path helpers
// ---------------------------------------------------------------------------

const ARM_LENGTH = ROAD_HALF;
const EXIT = ARM_LENGTH * 0.5;

// Centre of outbound through-lanes for each exit direction
const EXIT_EAST_Y = CENTER_Y + LANE_W * 1.5; // eastbound  (west-arm  lanes)
const EXIT_WEST_Y = BOX_TOP + LANE_W * 1.5; // westbound  (east-arm  lanes)
const EXIT_SOUTH_X = BOX_LEFT + LANE_W * 1.5; // southbound (north-arm lanes)
const EXIT_NORTH_X = CENTER_X + LANE_W * 1.5; // northbound (south-arm lanes)

interface Vec2 {
  x: number;
  y: number;
}

/** Quadratic bezier position at parameter t ∈ [0,1]. */
function qbPos(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/** Quadratic bezier tangent direction at parameter t. */
function qbTangent(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

/**
 * Returns the three bezier control points for a clearing car's path.
 *
 * Straight cars use collinear p1 (midpoint) → linear path.
 * Turning cars use the perpendicular-corner construction:
 *   - For NS cars: p1.x = p0.x, p1.y = p2.y
 *   - For EW cars: p1.x = p2.x, p1.y = p0.y
 */
function getClearingPath(
  direction: Direction,
  laneType: LaneType,
): { p0: Vec2; p1: Vec2; p2: Vec2 } {
  switch (direction) {
    case 'north': {
      const x0 = laneX_NS('north', laneType);
      const p0: Vec2 = { x: x0, y: BOX_TOP };
      if (laneType === 'straight') {
        const p2: Vec2 = { x: x0, y: BOX_BOTTOM + EXIT };
        return { p0, p1: { x: x0, y: (BOX_TOP + BOX_BOTTOM + EXIT) / 2 }, p2 };
      } else if (laneType === 'left') {
        // Left turn → exits east arm going east
        const p2: Vec2 = { x: BOX_RIGHT + EXIT, y: EXIT_EAST_Y };
        return { p0, p1: { x: p0.x, y: p2.y }, p2 };
      } else {
        // Right turn → exits west arm going west
        const p2: Vec2 = { x: BOX_LEFT - EXIT, y: EXIT_WEST_Y };
        return { p0, p1: { x: p0.x, y: p2.y }, p2 };
      }
    }
    case 'south': {
      const x0 = laneX_NS('south', laneType);
      const p0: Vec2 = { x: x0, y: BOX_BOTTOM };
      if (laneType === 'straight') {
        const p2: Vec2 = { x: x0, y: BOX_TOP - EXIT };
        return { p0, p1: { x: x0, y: (BOX_BOTTOM + BOX_TOP - EXIT) / 2 }, p2 };
      } else if (laneType === 'left') {
        // Left turn → exits west arm going west
        const p2: Vec2 = { x: BOX_LEFT - EXIT, y: EXIT_WEST_Y };
        return { p0, p1: { x: p0.x, y: p2.y }, p2 };
      } else {
        // Right turn → exits east arm going east
        const p2: Vec2 = { x: BOX_RIGHT + EXIT, y: EXIT_EAST_Y };
        return { p0, p1: { x: p0.x, y: p2.y }, p2 };
      }
    }
    case 'west': {
      const y0 = laneY_EW('west', laneType);
      const p0: Vec2 = { x: BOX_LEFT, y: y0 };
      if (laneType === 'straight') {
        const p2: Vec2 = { x: BOX_RIGHT + EXIT, y: y0 };
        return { p0, p1: { x: (BOX_LEFT + BOX_RIGHT + EXIT) / 2, y: y0 }, p2 };
      } else if (laneType === 'left') {
        // Left turn → exits north arm going north
        const p2: Vec2 = { x: EXIT_NORTH_X, y: BOX_TOP - EXIT };
        return { p0, p1: { x: p2.x, y: p0.y }, p2 };
      } else {
        // Right turn → exits south arm going south
        const p2: Vec2 = { x: EXIT_SOUTH_X, y: BOX_BOTTOM + EXIT };
        return { p0, p1: { x: p2.x, y: p0.y }, p2 };
      }
    }
    case 'east': {
      const y0 = laneY_EW('east', laneType);
      const p0: Vec2 = { x: BOX_RIGHT, y: y0 };
      if (laneType === 'straight') {
        const p2: Vec2 = { x: BOX_LEFT - EXIT, y: y0 };
        return { p0, p1: { x: (BOX_RIGHT + BOX_LEFT - EXIT) / 2, y: y0 }, p2 };
      } else if (laneType === 'left') {
        // Left turn → exits south arm going south
        const p2: Vec2 = { x: EXIT_SOUTH_X, y: BOX_BOTTOM + EXIT };
        return { p0, p1: { x: p2.x, y: p0.y }, p2 };
      } else {
        // Right turn → exits north arm going north
        const p2: Vec2 = { x: EXIT_NORTH_X, y: BOX_TOP - EXIT };
        return { p0, p1: { x: p2.x, y: p0.y }, p2 };
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Clearing car positions (animated through intersection box)
// ---------------------------------------------------------------------------

function getClearingCarPosition(car: Car): { x: number; y: number; angle: number } {
  const t = car.clearingProgress ?? 0;
  const { p0, p1, p2 } = getClearingPath(car.direction, car.laneType);
  const pos = qbPos(p0, p1, p2, t);
  const tan = qbTangent(p0, p1, p2, t);
  const angle = Math.atan2(tan.y, tan.x);
  return { x: pos.x, y: pos.y, angle };
}

// ---------------------------------------------------------------------------
// Draw a single car
// ---------------------------------------------------------------------------

function drawCar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  car: Car,
): void {
  const color = DIR_COLORS[car.direction];

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const hw = CAR_W / 2;
  const hh = CAR_H / 2;

  // Car body
  ctx.fillStyle = color;
  roundRect(ctx, -hw, -hh, CAR_W, CAR_H, 2);
  ctx.fill();

  // Windshield
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(-hw + 2, -hh + 1, CAR_W - 4, CAR_H / 2 - 1);

  // Headlights
  ctx.fillStyle = '#ffffa0';
  ctx.fillRect(-hw, -hh, 3, 2);
  ctx.fillRect(hw - 3, -hh, 3, 2);

  // Taillights
  ctx.fillStyle = '#ff3030';
  ctx.fillRect(-hw, hh - 2, 3, 2);
  ctx.fillRect(hw - 3, hh - 2, 3, 2);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Export for renderer composition
export { DIR_COLORS };
// Suppress unused warning for CENTER_X/Y imports used implicitly
void CENTER_X;
void CENTER_Y;
