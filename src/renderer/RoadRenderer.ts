/**
 * RoadRenderer.ts
 * Draws the static intersection geometry: pavement, lanes, stop lines, crosswalks.
 * Pure functions — accepts a CanvasRenderingContext2D and draws; returns void.
 */

import {
  CENTER_X,
  CENTER_Y,
  LANE_W,
  ROAD_HALF,
  BOX_LEFT,
  BOX_RIGHT,
  BOX_TOP,
  BOX_BOTTOM,
  ARM_LENGTH,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '../constants';

// ---------------------------------------------------------------------------
// Colour palette
// ---------------------------------------------------------------------------

const COLOR_ASPHALT = '#2d2d2d';
const COLOR_PAVEMENT_EDGE = '#3a3a3a';
const COLOR_GRASS = '#1a2a1a';
const COLOR_LANE_MARK = 'rgba(255,255,255,0.6)';
const COLOR_STOP_LINE = 'rgba(255,255,255,0.9)';
const COLOR_CROSSWALK = 'rgba(255,255,255,0.25)';
const COLOR_ARROW = 'rgba(255,255,255,0.4)';

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function drawRoad(ctx: CanvasRenderingContext2D): void {
  drawBackground(ctx);
  drawArmPavement(ctx);
  drawIntersectionBox(ctx);
  drawLaneMarkings(ctx);
  drawStopLines(ctx);
  drawCrosswalks(ctx);
  drawLaneArrows(ctx);
}

// ---------------------------------------------------------------------------
// Background (grass / surroundings)
// ---------------------------------------------------------------------------

function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR_GRASS;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// ---------------------------------------------------------------------------
// Arm pavement
// ---------------------------------------------------------------------------

function drawArmPavement(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR_ASPHALT;

  const roadSize = ROAD_HALF * 2;
  const armTop = BOX_TOP - ARM_LENGTH;
  const armBottom = BOX_BOTTOM + ARM_LENGTH;

  // North arm
  ctx.fillRect(BOX_LEFT, armTop, roadSize, BOX_TOP - armTop);
  // South arm
  ctx.fillRect(BOX_LEFT, BOX_BOTTOM, roadSize, armBottom - BOX_BOTTOM);
  // West arm
  ctx.fillRect(BOX_LEFT - ARM_LENGTH, BOX_TOP, BOX_LEFT - (BOX_LEFT - ARM_LENGTH), roadSize);
  // East arm
  ctx.fillRect(BOX_RIGHT, BOX_TOP, ARM_LENGTH, roadSize);

  // Subtle edge shadow
  ctx.strokeStyle = COLOR_PAVEMENT_EDGE;
  ctx.lineWidth = 1;
}

// ---------------------------------------------------------------------------
// Intersection box
// ---------------------------------------------------------------------------

function drawIntersectionBox(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR_ASPHALT;
  ctx.fillRect(BOX_LEFT, BOX_TOP, ROAD_HALF * 2, ROAD_HALF * 2);
}

// ---------------------------------------------------------------------------
// Lane markings (dashed centre lines + solid edge lines)
// ---------------------------------------------------------------------------

function drawLaneMarkings(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = COLOR_LANE_MARK;
  ctx.lineWidth = 1;
  ctx.setLineDash([18, 10]);

  // N-S lane dividers (vertical dashes inside each arm)
  for (let i = 1; i < 4; i++) {
    const x = BOX_LEFT + i * LANE_W;
    // In the north arm
    drawDashedLine(ctx, x, BOX_TOP - ARM_LENGTH, x, BOX_TOP);
    // In the south arm
    drawDashedLine(ctx, x, BOX_BOTTOM, x, BOX_BOTTOM + ARM_LENGTH);
    // Second set for the east half (same x position but in road_half × 2 range)
    const x2 = BOX_LEFT + ROAD_HALF + i * LANE_W;
    drawDashedLine(ctx, x2, BOX_TOP - ARM_LENGTH, x2, BOX_TOP);
    drawDashedLine(ctx, x2, BOX_BOTTOM, x2, BOX_BOTTOM + ARM_LENGTH);
  }

  // Centre divider (solid yellow) for N-S road
  ctx.strokeStyle = 'rgba(255, 220, 0, 0.6)';
  ctx.setLineDash([]);
  ctx.lineWidth = 2;
  // North arm centre
  ctx.beginPath();
  ctx.moveTo(CENTER_X, BOX_TOP - ARM_LENGTH);
  ctx.lineTo(CENTER_X, BOX_TOP);
  ctx.stroke();
  // South arm centre
  ctx.beginPath();
  ctx.moveTo(CENTER_X, BOX_BOTTOM);
  ctx.lineTo(CENTER_X, BOX_BOTTOM + ARM_LENGTH);
  ctx.stroke();

  // E-W lane dividers (horizontal dashes)
  ctx.strokeStyle = COLOR_LANE_MARK;
  ctx.setLineDash([18, 10]);
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = BOX_TOP + i * LANE_W;
    drawDashedLine(ctx, BOX_LEFT - ARM_LENGTH, y, BOX_LEFT, y);
    drawDashedLine(ctx, BOX_RIGHT, y, BOX_RIGHT + ARM_LENGTH, y);
    const y2 = BOX_TOP + ROAD_HALF + i * LANE_W;
    drawDashedLine(ctx, BOX_LEFT - ARM_LENGTH, y2, BOX_LEFT, y2);
    drawDashedLine(ctx, BOX_RIGHT, y2, BOX_RIGHT + ARM_LENGTH, y2);
  }

  // Centre divider for E-W road
  ctx.strokeStyle = 'rgba(255, 220, 0, 0.6)';
  ctx.setLineDash([]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(BOX_LEFT - ARM_LENGTH, CENTER_Y);
  ctx.lineTo(BOX_LEFT, CENTER_Y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(BOX_RIGHT, CENTER_Y);
  ctx.lineTo(BOX_RIGHT + ARM_LENGTH, CENTER_Y);
  ctx.stroke();

  ctx.setLineDash([]);
}

function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Stop lines
// ---------------------------------------------------------------------------

function drawStopLines(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = COLOR_STOP_LINE;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  // North approach (southbound cars stop at top of intersection box)
  line(ctx, BOX_LEFT, BOX_TOP, CENTER_X, BOX_TOP);
  // South approach (northbound cars)
  line(ctx, CENTER_X, BOX_BOTTOM, BOX_RIGHT, BOX_BOTTOM);
  // West approach (eastbound cars stop at left of intersection box)
  line(ctx, BOX_LEFT, BOX_TOP, BOX_LEFT, CENTER_Y);
  // East approach (westbound cars)
  line(ctx, BOX_RIGHT, CENTER_Y, BOX_RIGHT, BOX_BOTTOM);
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Crosswalks (zebra stripes)
// ---------------------------------------------------------------------------

const STRIPE_W = 8;
const STRIPE_GAP = 5;
const CW_WIDTH = 14; // depth of crosswalk from curb inward

function drawCrosswalks(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR_CROSSWALK;

  // North crosswalk (horizontal stripes just above the intersection box)
  drawHorizontalCrosswalk(ctx, BOX_LEFT + 2, BOX_TOP - CW_WIDTH - 2, ROAD_HALF * 2 - 4, CW_WIDTH);
  // South crosswalk
  drawHorizontalCrosswalk(ctx, BOX_LEFT + 2, BOX_BOTTOM + 2, ROAD_HALF * 2 - 4, CW_WIDTH);
  // West crosswalk (vertical stripes)
  drawVerticalCrosswalk(ctx, BOX_LEFT - CW_WIDTH - 2, BOX_TOP + 2, CW_WIDTH, ROAD_HALF * 2 - 4);
  // East crosswalk
  drawVerticalCrosswalk(ctx, BOX_RIGHT + 2, BOX_TOP + 2, CW_WIDTH, ROAD_HALF * 2 - 4);
}

function drawHorizontalCrosswalk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  let cx = x;
  while (cx < x + w) {
    ctx.fillRect(cx, y, STRIPE_W, h);
    cx += STRIPE_W + STRIPE_GAP;
  }
}

function drawVerticalCrosswalk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  let cy = y;
  while (cy < y + h) {
    ctx.fillRect(x, cy, w, STRIPE_W);
    cy += STRIPE_W + STRIPE_GAP;
  }
}

// ---------------------------------------------------------------------------
// Lane direction arrows
// ---------------------------------------------------------------------------

function drawLaneArrows(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR_ARROW;

  // North approach (southbound): lanes left to right = [right-turn, straight, straight, left-turn]
  // Lane centres (x): BOX_LEFT + LANE_W*0.5, +1.5, +2.5, +3.5
  const southLaneCentres = [0, 1, 2, 3].map((i) => BOX_LEFT + LANE_W * (i + 0.5));
  const arrowY_N = BOX_TOP - 60;
  drawArrow(ctx, southLaneCentres[0]!, arrowY_N, 'right-from-south');
  drawArrow(ctx, southLaneCentres[1]!, arrowY_N, 'down');
  drawArrow(ctx, southLaneCentres[2]!, arrowY_N, 'down');
  drawArrow(ctx, southLaneCentres[3]!, arrowY_N, 'left-from-south');

  // South approach (northbound): right half lanes
  const northLaneCentres = [0, 1, 2, 3].map((i) => BOX_LEFT + ROAD_HALF + LANE_W * (i + 0.5));
  const arrowY_S = BOX_BOTTOM + 60;
  drawArrow(ctx, northLaneCentres[0]!, arrowY_S, 'left-from-north');
  drawArrow(ctx, northLaneCentres[1]!, arrowY_S, 'up');
  drawArrow(ctx, northLaneCentres[2]!, arrowY_S, 'up');
  drawArrow(ctx, northLaneCentres[3]!, arrowY_S, 'right-from-north');

  // West approach (eastbound): bottom half lanes
  const eastLaneCentres = [0, 1, 2, 3].map((i) => BOX_TOP + ROAD_HALF + LANE_W * (i + 0.5));
  const arrowX_W = BOX_LEFT - 60;
  drawArrow(ctx, arrowX_W, eastLaneCentres[0]!, 'up-from-east');
  drawArrow(ctx, arrowX_W, eastLaneCentres[1]!, 'right');
  drawArrow(ctx, arrowX_W, eastLaneCentres[2]!, 'right');
  drawArrow(ctx, arrowX_W, eastLaneCentres[3]!, 'down-from-east');

  // East approach (westbound): top half lanes.
  // Lane order on canvas: [0]=north edge (driver's right=right-turn), [3]=south edge (driver's left=left-turn).
  const westLaneCentres = [0, 1, 2, 3].map((i) => BOX_TOP + LANE_W * (i + 0.5));
  const arrowX_E = BOX_RIGHT + 60;
  drawArrow(ctx, arrowX_E, westLaneCentres[0]!, 'up-from-west'); // right turn
  drawArrow(ctx, arrowX_E, westLaneCentres[1]!, 'left');
  drawArrow(ctx, arrowX_E, westLaneCentres[2]!, 'left');
  drawArrow(ctx, arrowX_E, westLaneCentres[3]!, 'down-from-west'); // left turn
}

type ArrowDir =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'left-from-south'
  | 'right-from-south'
  | 'left-from-north'
  | 'right-from-north'
  | 'up-from-east'
  | 'down-from-east'
  | 'up-from-west'
  | 'down-from-west';

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: ArrowDir): void {
  ctx.save();
  ctx.translate(x, y);

  // Map complex directions to a rotation + curved variant
  const rot: Record<ArrowDir, number> = {
    up: 0,
    down: Math.PI,
    left: -Math.PI / 2,
    right: Math.PI / 2,
    'left-from-south': -Math.PI / 4, // curve left relative to southbound
    'right-from-south': (Math.PI / 4) * 3,
    'left-from-north': Math.PI / 4,
    'right-from-north': (-Math.PI / 4) * 3,
    'up-from-east': -Math.PI / 4,
    'down-from-east': (Math.PI / 4) * 3,
    'up-from-west': Math.PI / 4,
    'down-from-west': (-Math.PI / 4) * 3,
  };

  ctx.rotate(rot[dir] ?? 0);

  // Simple arrowhead pointing up
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-1.5, 0);
  ctx.lineTo(-1.5, 7);
  ctx.lineTo(1.5, 7);
  ctx.lineTo(1.5, 0);
  ctx.lineTo(4, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
