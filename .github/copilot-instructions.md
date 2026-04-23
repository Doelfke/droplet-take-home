# Copilot Instructions — Traffic Intersection Simulator

## Project summary

A browser-based 4-way traffic intersection simulation.
**Stack**: TypeScript 5 · React 19 · HTML5 Canvas · Vite 6 · Vitest 3

## Build & test commands

```
npm run dev         # dev server on :5173
npm run build       # tsc -b + vite build
npm run test        # vitest run (all tests)
npm run coverage    # vitest run --coverage
npm run lint        # eslint src tests
```

## Module map

| Path                           | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `src/core/phases.ts`           | `IntersectionPhase` enum, phase timing, sequence helpers |
| `src/core/signal.ts`           | `SignalColor` type, per-phase signal map, `canMove()`    |
| `src/core/car.ts`              | `Car` interface + lifecycle helpers                      |
| `src/core/lane.ts`             | Lane queues + immutable update functions                 |
| `src/core/sensor.ts`           | Presence detection + adaptive phase duration             |
| `src/core/pedestrian.ts`       | Walk-button state machine                                |
| `src/core/intersection.ts`     | `tick()` orchestrator — the top-level state machine      |
| `src/renderer/*`               | Canvas draw functions; no state mutation                 |
| `src/hooks/useIntersection.ts` | RAF loop + React state bridge                            |
| `src/components/*`             | React UI shell only                                      |
| `src/constants.ts`             | All numeric constants; edit here to tune timing/geometry |

## Architecture rules

1. `src/core/**` must be **pure TypeScript** — zero DOM, zero React, zero side effects.
2. Renderer functions **accept state and draw**; they never mutate state.
3. The RAF loop lives **only** in `useIntersection.ts`.
4. All state updates go through `tick()` or the explicit mutators (`requestWalk`, `notifyCarArrival`).
5. Prefer **immutable spreads** (`{ ...state, field: newValue }`) — never mutate IntersectionState directly.
6. Use **discriminated unions** for phase/signal types.

## Testing conventions

- Use `seededRng(n)` for any test involving randomness.
- Use `noArrivalRng = () => 0` to suppress arrivals; `alwaysArriveRng = () => 1` to force them.
- Safety invariant test: verify no N/S + E/W greens simultaneously across a full cycle.
