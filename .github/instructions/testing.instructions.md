---
applyTo: 'tests/**/*.test.ts'
---

# Testing Instructions

## Framework

- Use **Vitest** with `describe` / `it` / `expect`.
- Tests run in Node (no browser) — no DOM APIs in test files.

## Determinism

- Never call `Math.random()` in tests.
- Use `seededRng(n)` for reproducible scenarios.
- Use `noArrivalRng = () => 0` to suppress car arrivals.
- Use `alwaysArriveRng = () => 1` to force arrivals every tick.

## Required test categories

1. **Phase transitions** — verify each phase in the sequence.
2. **Safety invariants** — assert no conflicting N/S + E/W greens across a full cycle.
3. **Sensor adaptation** — test min-duration cutoff and max-duration cap.
4. **Walk button** — pending, dedup, injection into cycle, post-clear resumption.
5. **Flashing orange** — permissive allow and block cases.

## Renderer tests

- Mock `CanvasRenderingContext2D` methods with `vi.fn()`.
- Assert draw calls were made; do not assert pixel values.

## Conventions

- Prefer `advance(state, ms)` helpers over inline `tick()` calls.
- Always use `noArrivalRng` unless the test is specifically about arrivals.
- Name test files `<module>.test.ts` mirroring the source path.
