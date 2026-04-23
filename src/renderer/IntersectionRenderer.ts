/**
 * IntersectionRenderer.ts
 * Composite renderer: clears and redraws the entire canvas each frame
 * from the pure IntersectionState snapshot.
 */

import { IntersectionState } from '../core/intersection';
import { Direction, LaneType, DIRECTIONS, LANE_TYPES, getSignals } from '../core/signal';
import { IntersectionPhase } from '../core/phases';
import { Car } from '../core/car';
import { drawRoad } from './RoadRenderer';
import { drawSignals, drawDirectionLabels, drawWalkIndicators } from './SignalRenderer';
import { drawCars } from './CarRenderer';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BOX_LEFT,
  BOX_RIGHT,
  BOX_TOP,
  BOX_BOTTOM,
} from '../constants';

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function renderIntersection(ctx: CanvasRenderingContext2D, state: IntersectionState): void {
  // 1. Clear
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 2. Static road geometry
  drawRoad(ctx);

  // 3. Direction labels
  drawDirectionLabels(ctx);

  // 4. Traffic signals
  const signals = getSignals(state.phase);
  drawSignals(ctx, signals, state.phase, state.flashingOn);

  // 5. Cars
  const queued = buildQueuedMap(state);
  drawCars(ctx, queued, state.clearing);

  // 6. Pedestrian walk indicators
  drawWalkIndicators(
    ctx,
    state.phase === IntersectionPhase.PEDESTRIAN_CLEAR,
    state.pedestrian.pendingDirections,
  );

  // 7. Pedestrian clear overlay
  if (state.phase === IntersectionPhase.PEDESTRIAN_CLEAR) {
    drawPedestrianOverlay(ctx, state.phaseElapsed, state.phaseDuration);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Map<"dir:type", Car[]> for the CarRenderer. */
function buildQueuedMap(state: IntersectionState): ReadonlyMap<string, readonly Car[]> {
  const map = new Map<string, readonly Car[]>();
  for (const dir of DIRECTIONS) {
    for (const type of LANE_TYPES) {
      const q = state.lanes[dir][type].queue;
      if (q.length > 0) {
        map.set(`${dir}:${type}`, q);
      }
    }
  }
  return map;
}

/** Semi-transparent blue overlay during pedestrian clear phase. */
function drawPedestrianOverlay(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  duration: number,
): void {
  const progress = Math.min(elapsed / duration, 1);
  const alpha = 0.18 * (1 - progress * 0.5);

  // Crosswalk glow
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#00aaff';

  // Horizontal crosswalks
  ctx.fillRect(BOX_LEFT, BOX_TOP - 20, BOX_RIGHT - BOX_LEFT, 20);
  ctx.fillRect(BOX_LEFT, BOX_BOTTOM, BOX_RIGHT - BOX_LEFT, 20);
  // Vertical crosswalks
  ctx.fillRect(BOX_LEFT - 20, BOX_TOP, 20, BOX_BOTTOM - BOX_TOP);
  ctx.fillRect(BOX_RIGHT, BOX_TOP, 20, BOX_BOTTOM - BOX_TOP);

  ctx.restore();

  // "WALK" text
  ctx.save();
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#00ff88';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const pulse = Math.sin(elapsed / 300) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;

  const cx = (BOX_LEFT + BOX_RIGHT) / 2;
  const cy = (BOX_TOP + BOX_BOTTOM) / 2;
  ctx.fillText('WALK', cx, cy);

  ctx.restore();
}

// Export type re-use
export type { Direction, LaneType };
