---
applyTo: 'src/**'
---

# Coding Instructions

## TypeScript style

- Use **strict** TypeScript (`"strict": true` in tsconfig). No `any`, no `as unknown`.
- Prefer `readonly` arrays and properties for state objects.
- Use discriminated unions for variant types (e.g., `SignalColor`, `IntersectionPhase`).
- Export named functions, not default exports (except React components).

## Core domain (`src/core/**`)

- Pure functions only. No `Math.random()` calls — accept an `RngFn` parameter.
- No DOM APIs, no `window`, no `document`.
- Immutable state: always return `{ ...state, changedField }` — never mutate in place.
- Phase transitions happen only in `intersection.ts`; other modules compute derived values.

## Renderer (`src/renderer/**`)

- Functions receive a `CanvasRenderingContext2D` as the first argument.
- Always call `ctx.save()` / `ctx.restore()` around style changes.
- No state mutation inside renderers.
- All geometry constants come from `src/constants.ts`.

## React components (`src/components/**`, `src/hooks/**`)

- RAF loop lives **only** in `useIntersection.ts`.
- Components are purely presentational — they call hook outputs; they don't call `tick()` directly.
- Use `useRef` for mutable values that don't trigger re-renders (rAF ID, state snapshot).
- Use `useCallback` for event handlers passed as props.
