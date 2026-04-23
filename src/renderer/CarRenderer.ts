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
    // Southbound: west half of N-S road (BOX_LEFT .. CENTER_X)
    return BOX_LEFT + order * LANE_W + LANE_W / 2;
  } else {
    // Northbound: east half of N-S road (CENTER_X .. BOX_RIGHT)
    return CENTER_X + order * LANE_W + LANE_W / 2;
  }
}

/** Lane centre Y for a lane in the East or West arm (E-W road). */
function laneY_EW(dir: Direction, laneType: LaneType, laneIndex = 0): number {
  const order = LANE_ORDER[laneType][laneIndex] ?? LANE_ORDER[laneType][0] ?? 0;
  if (dir === 'west') {
    // Eastbound: south half of E-W road (CENTER_Y .. BOX_BOTTOM)
    return CENTER_Y + order * LANE_W + LANE_W / 2;
  } else {
    // Westbound: north half of E-W road (BOX_TOP .. CENTER_Y)
    return BOX_TOP + order * LANE_W + LANE_W / 2;
  }
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

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
      drawCar(ctx, pos.x, pos.y, dir, car);
    });
  });

  // Draw clearing cars (in intersection box or exiting)
  for (const car of clearing) {
    if (!isClearing(car)) continue;
    const pos = getClearingCarPosition(car);
    drawCar(ctx, pos.x, pos.y, car.direction, car);
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
// Clearing car positions (animated through intersection box)
// ---------------------------------------------------------------------------

function getClearingCarPosition(car: Car): { x: number; y: number } {
  const t = car.clearingProgress ?? 0; // 0..1

  switch (car.direction) {
    case 'north': {
      // Southbound: entering from top, exiting at bottom
      const cx = laneX_NS('north', car.laneType);
      const startY = BOX_TOP;
      const endY = BOX_BOTTOM + ARM_LENGTH * 0.5;
      return { x: cx, y: lerp(startY, endY, t) };
    }
    case 'south': {
      const cx = laneX_NS('south', car.laneType);
      const startY = BOX_BOTTOM;
      const endY = BOX_TOP - ARM_LENGTH * 0.5;
      return { x: cx, y: lerp(startY, endY, t) };
    }
    case 'west': {
      const cy = laneY_EW('west', car.laneType);
      const startX = BOX_LEFT;
      const endX = BOX_RIGHT + ARM_LENGTH * 0.5;
      return { x: lerp(startX, endX, t), y: cy };
    }
    case 'east': {
      const cy = laneY_EW('east', car.laneType);
      const startX = BOX_RIGHT;
      const endX = BOX_LEFT - ARM_LENGTH * 0.5;
      return { x: lerp(startX, endX, t), y: cy };
    }
  }
}

const ARM_LENGTH = ROAD_HALF;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Draw a single car
// ---------------------------------------------------------------------------

function drawCar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: Direction,
  _car: Car,
): void {
  void _car;
  const color = DIR_COLORS[dir];

  ctx.save();
  ctx.translate(cx, cy);

  // Rotate to face travel direction
  const rot: Record<Direction, number> = {
    north: Math.PI / 2, // heading south on canvas
    south: -Math.PI / 2, // heading north on canvas
    west: 0, // heading right
    east: Math.PI, // heading left
  };
  ctx.rotate(rot[dir]);

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
