/**
 * SignalRenderer.ts
 * Draws traffic signal heads at each approach.
 */

import { IntersectionSignals, SignalColor, Direction } from '../core/signal';
import { IntersectionPhase } from '../core/phases';
import {
  BOX_LEFT,
  BOX_RIGHT,
  BOX_TOP,
  BOX_BOTTOM,
  ROAD_HALF,
  LANE_W,
  ARM_LENGTH,
} from '../constants';

// ---------------------------------------------------------------------------
// Signal head geometry
// ---------------------------------------------------------------------------

const HEAD_W = 16;
const HEAD_H = 34; // holds straight signal (2 lights) and left-turn signal (2 lights)
const BULB_R = 5.5;

// ---------------------------------------------------------------------------
// Colour map
// ---------------------------------------------------------------------------

const SIGNAL_COLORS: Record<SignalColor, string> = {
  red: '#e03030',
  yellow: '#e0c030',
  green: '#30c060',
  flashingOrange: '#ff8800',
};

const SIGNAL_OFF: Record<SignalColor, string> = {
  red: '#3a1010',
  yellow: '#3a3010',
  green: '#103a20',
  flashingOrange: '#3a2000',
};

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/**
 * Draw all signal heads for all 4 directions.
 * `flashingOn` drives the flashing-orange animation (toggled by IntersectionRenderer).
 */
export function drawSignals(
  ctx: CanvasRenderingContext2D,
  signals: IntersectionSignals,
  phase: IntersectionPhase,
  flashingOn: boolean,
): void {
  void phase; // reserved for future phase-specific rendering tweaks

  // Each direction has TWO signal heads: one for straight/right, one for left-turn.
  // We place them just outside the intersection box on each approach.

  // North approach (southbound) – signals on the right side of oncoming traffic
  drawSignalHead(
    ctx,
    BOX_LEFT - 24,
    BOX_TOP - 8,
    'vertical',
    signals.north.straight,
    signals.north.left,
    flashingOn,
  );

  // South approach (northbound) – opposite side
  drawSignalHead(
    ctx,
    BOX_RIGHT + 8,
    BOX_BOTTOM + 8 - HEAD_H,
    'vertical',
    signals.south.straight,
    signals.south.left,
    flashingOn,
  );

  // West approach (eastbound)
  drawSignalHead(
    ctx,
    BOX_LEFT - 8 - HEAD_H,
    BOX_TOP + ROAD_HALF + 8,
    'horizontal',
    signals.west.straight,
    signals.west.left,
    flashingOn,
  );

  // East approach (westbound)
  drawSignalHead(
    ctx,
    BOX_RIGHT + 8,
    BOX_TOP - 8,
    'horizontal',
    signals.east.straight,
    signals.east.left,
    flashingOn,
  );
}

// ---------------------------------------------------------------------------
// Signal head rendering
// ---------------------------------------------------------------------------

type Orientation = 'vertical' | 'horizontal';

/**
 * Draws a combined signal head with:
 * - Top half: main signal (red / yellow / green)
 * - Bottom half: left-turn signal (red / yellow / green / flashingOrange)
 */
function drawSignalHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  orientation: Orientation,
  straightColor: SignalColor,
  leftColor: SignalColor,
  flashingOn: boolean,
): void {
  const hw = orientation === 'vertical' ? HEAD_W : HEAD_H;
  const hh = orientation === 'vertical' ? HEAD_H : HEAD_W;

  // Housing
  ctx.save();
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, hw, hh, 3);
  ctx.fill();
  ctx.stroke();

  // Main signal bulbs: red, yellow, green (top to bottom / left to right)
  const mainSignals: [SignalColor, SignalColor][] = [
    ['red', straightColor],
    ['yellow', straightColor],
    ['green', straightColor],
  ];

  if (orientation === 'vertical') {
    const cx = x + hw / 2;
    // Main signal: top 3 lights
    mainSignals.forEach(([bulb, active], i) => {
      const lit = bulb === active;
      const cy = y + BULB_R + 2 + i * (BULB_R * 2 + 3);
      drawBulb(
        ctx,
        cx,
        cy,
        BULB_R,
        bulb,
        lit,
        bulb === 'flashingOrange' && !flashingOn ? false : lit,
      );
    });
    // Left-turn signal (bottom area)
    const ltY = y + hh - BULB_R - 4;
    const ltLit = leftColor === 'flashingOrange' ? flashingOn : leftColor !== 'red';
    const ltColor = leftColor === 'flashingOrange' ? 'flashingOrange' : leftColor;
    drawBulb(ctx, cx, ltY, BULB_R, ltColor, ltLit, ltLit);
  } else {
    const cy = y + hh / 2;
    mainSignals.forEach(([bulb, active], i) => {
      const lit = bulb === active;
      const bx = x + BULB_R + 2 + i * (BULB_R * 2 + 3);
      drawBulb(ctx, bx, cy, BULB_R, bulb, lit, lit);
    });
    const ltX = x + hw - BULB_R - 4;
    const ltLit = leftColor === 'flashingOrange' ? flashingOn : leftColor !== 'red';
    const ltColor = leftColor === 'flashingOrange' ? 'flashingOrange' : leftColor;
    drawBulb(ctx, ltX, cy, BULB_R, ltColor, ltLit, ltLit);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Individual bulb
// ---------------------------------------------------------------------------

function drawBulb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: SignalColor,
  _shouldBeLit: boolean,
  lit: boolean,
): void {
  void _shouldBeLit;
  const fill = lit ? SIGNAL_COLORS[color] : SIGNAL_OFF[color];

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();

  if (lit) {
    // Glow effect
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
    grd.addColorStop(0, fill + '88');
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Direction labels (small text on each arm)
// ---------------------------------------------------------------------------

export function drawDirectionLabels(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';

  const mid = ROAD_HALF / 2;
  // N label (southbound arm)
  ctx.fillText('N', BOX_LEFT + mid, BOX_TOP - ARM_LENGTH + 14);
  // S label (northbound arm)
  ctx.fillText('S', BOX_RIGHT - mid, BOX_BOTTOM + ARM_LENGTH - 6);
  // W label (eastbound arm)
  ctx.fillText('W', BOX_LEFT - ARM_LENGTH + 8, BOX_TOP + ROAD_HALF + mid + 4);
  // E label (westbound arm)
  ctx.fillText('E', BOX_RIGHT + ARM_LENGTH - 8, BOX_TOP + mid + 4);
}

// ---------------------------------------------------------------------------
// Pedestrian walk indicators
// ---------------------------------------------------------------------------

export function drawWalkIndicators(
  ctx: CanvasRenderingContext2D,
  pedestrianActive: boolean,
  pendingDirections: readonly Direction[],
): void {
  const dirs: Array<{ dir: Direction; x: number; y: number }> = [
    { dir: 'north', x: BOX_LEFT + ROAD_HALF / 2, y: BOX_TOP - 20 },
    { dir: 'south', x: BOX_RIGHT - ROAD_HALF / 2, y: BOX_BOTTOM + 20 },
    { dir: 'west', x: BOX_LEFT - 20, y: BOX_TOP + ROAD_HALF + ROAD_HALF / 2 },
    { dir: 'east', x: BOX_RIGHT + 20, y: BOX_TOP + ROAD_HALF / 2 },
  ];

  for (const { dir, x, y } of dirs) {
    const pending = pendingDirections.includes(dir);
    const active = pedestrianActive;

    if (!pending && !active) continue;

    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (active) {
      ctx.fillStyle = '#00ff88';
      ctx.fillText('🚶', x, y);
    } else if (pending) {
      ctx.fillStyle = '#ffcc00';
      ctx.fillText('🔔', x, y);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

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

// Export for testing
export { SIGNAL_COLORS, SIGNAL_OFF };
// Export lane width for car placement
export { LANE_W };
