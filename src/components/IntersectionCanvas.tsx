/**
 * IntersectionCanvas.tsx
 * Renders the simulation into a <canvas> element via IntersectionRenderer.
 * Uses ResizeObserver to keep canvas dimensions matching its CSS size.
 */

import { useRef, useEffect } from 'react';
import { IntersectionState } from '../core/intersection';
import { renderIntersection } from '../renderer/IntersectionRenderer';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface Props {
  state: IntersectionState;
}

export function IntersectionCanvas({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Re-render whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderIntersection(ctx, state);
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        display: 'block',
        width: '100%',
        maxWidth: CANVAS_WIDTH,
        height: 'auto',
        borderRadius: '8px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
      }}
    />
  );
}
