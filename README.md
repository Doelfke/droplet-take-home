# Traffic Intersection Simulator

![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/OWNER/REPO/actions/workflows/pages.yml/badge.svg)
[![codecov](https://codecov.io/gh/OWNER/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/OWNER/REPO)

> Replace `OWNER/REPO` in the badges above with your GitHub username and repository name.

A polished, browser-based 4-way traffic intersection simulation built with **TypeScript 5**, **React 19**, and **HTML5 Canvas**.

---

## Quick Start

```bash
npm install
npm run dev        # open http://localhost:5173
npm run test       # run all tests
npm run build      # type-check + production build
npm run coverage   # test coverage report
npm run lint       # ESLint
```

---

## Architecture

```
src/
├── core/            Pure TypeScript state machine (zero DOM dependencies)
│   ├── phases.ts    IntersectionPhase enum + timing table + sequence logic
│   ├── signal.ts    SignalColor types + per-phase signal map + canMove()
│   ├── car.ts       Car data type + lifecycle helpers (create/advance/clear)
│   ├── lane.ts      Lane queues + immutable update helpers
│   ├── sensor.ts    Presence detection + adaptive duration computation
│   ├── pedestrian.ts Walk-button state + debounce + request lifecycle
│   └── intersection.ts  Top-level tick() orchestrator; immutable state machine
├── renderer/        Canvas draw functions (accept state, return void)
│   ├── RoadRenderer.ts     Pavement, lane markings, stop lines, crosswalks
│   ├── SignalRenderer.ts   Signal heads, bulbs, glow, walk indicators
│   ├── CarRenderer.ts      Queued + clearing car sprites with directional rotation
│   └── IntersectionRenderer.ts  Composite: clear + redraw each frame
├── hooks/
│   └── useIntersection.ts  requestAnimationFrame loop; bridges core → React state
├── components/
│   ├── App.tsx              Root layout
│   ├── IntersectionCanvas.tsx  <canvas> ref + render trigger
│   └── Controls.tsx         Walk buttons, speed, pause, stats HUD
├── constants.ts     All geometry, timing and simulation constants
└── main.tsx
```

### Key design decisions

| Decision                 | Rationale                                                                        |
| ------------------------ | -------------------------------------------------------------------------------- |
| **Canvas over SVG/DOM**  | Direct pixel control, smooth 60 fps animation, zero layout thrash                |
| **Immutable core state** | `tick()` returns a new object → trivial to test, snapshot, or replay             |
| **Pure simulation core** | `src/core` has zero DOM or React imports → runs in Node/Vitest without a browser |
| **Injectable RNG**       | `seededRng(n)` enables fully deterministic test scenarios                        |
| **MVP-first sequencing** | Working sim ships first; hardening (CI, lint, coverage gates) is non-blocking    |

---

## Signal Phase Cycle

```
NS_STRAIGHT  ─►  NS_YELLOW  ─►  NS_LEFT  ─►  NS_LEFT_YELLOW
    ▲                                                  │
    └──  EW_LEFT_YELLOW  ◄──  EW_LEFT  ◄──  EW_YELLOW  ◄──  EW_STRAIGHT
```

A **PEDESTRIAN_CLEAR** phase is injected between any yellow→red boundary when a walk button has been pressed. The cycle resumes normally afterward.

---

## Implemented Features

### ✅ Timer-based signal cycle

All phases advance on configurable min/max timers. Yellow transitions are fixed at 3 s; green phases range from 10–45 s (straight) or 5–20 s (left-turn).

### ✅ Car arrival & departure

Cars arrive on each of the 12 lanes (4 directions × 3 types) via a Poisson-like process. They queue behind the stop line and animate through the intersection box when their signal is green.

### ✅ Opposite-pair left turns

During `NS_LEFT`, both north and south left-turn lanes get a dedicated green simultaneously. The straight lights are **red** — no accidents possible. Same for `EW_LEFT`.

### ✅ Flashing-orange permissive left turns

During `NS_STRAIGHT` (and `EW_STRAIGHT`), left-turn lanes show **flashing orange**. A car may turn left only if no oncoming straight/right-turn traffic is present or clearing. The check is performed each tick.

### ✅ Sensor-adaptive phases

Each green phase computes its duration dynamically: `minDuration + carsWaiting × 2 s`, capped at `maxDuration`. If the green side is empty after `minDuration` the phase ends early, keeping unused red time off other directions.

### ✅ Walk buttons (4 directions)

Press any walk button to queue a pedestrian crossing. At the next yellow→red transition the simulation injects a `PEDESTRIAN_CLEAR` phase (all red, 6 s). Duplicate presses for the same direction are debounced. Invalid direction values are rejected.

---

## Safety Invariants

Verified by the test suite (`tests/core/signal.test.ts`, `tests/core/intersection.test.ts`):

1. **No conflicting greens** — N/S and E/W are never simultaneously green in any combination. Tested across 5 full simulation cycles with active traffic.
2. **Straight lights are red during opposite-pair left-turn phases** — `NS_LEFT` sets N/S straight to red; `EW_LEFT` sets E/W straight to red.
3. **No movement through red** — `canMove()` explicitly checks signal state before any car transitions from queued → clearing.
4. **Flashing orange blocked by oncoming conflict** — checked in `canMove()` with `hasOncomingConflict` flag.

---

## Testing

```bash
npm run test        # 50+ deterministic scenario tests
npm run coverage    # coverage report (target ≥80% lines/branches in src/core)
```

Tests use **Vitest** with a seedable LCG RNG so arrival randomness is fully reproducible. No browser APIs are required — the core runs in Node.

---

## Tradeoffs & Limitations

- **Right-on-red not implemented** — right turns require a green signal. Extending this would be a small addition to `canMove()`.
- **Starvation guard tracking** is computed but the phase-override logic is conservative — it detects the condition but does not yet force an out-of-order phase jump. A clean next step would be to insert the starving direction's phase at the next yellow boundary.
- **Single-lane car rendering** — the canvas renders one car per lane-type column. In reality, straight lanes have two sub-lanes; a future improvement would split them.
- **No turn animation curves** — clearing cars travel in a straight line through the box. Bezier-curved paths would add realism.

---

## LLM-Assisted Engineering Notes

This project was designed with Copilot collaboration in mind:

- **`.github/copilot-instructions.md`** — workspace-wide rules: module map, architecture constraints, immutable state pattern.
- **`.github/instructions/`** — per-glob coding, testing, and security instruction files.
- **`.github/agents/`** — specialised agent definitions for coding, testing, and security review.

The simulation core is fully isolated from the renderer and React layer, making it straightforward for an LLM to reason about, test, and extend individual modules without side effects.
