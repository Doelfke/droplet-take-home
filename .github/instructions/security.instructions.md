---
description: Security review for user input, DOM interaction and canvas text rendering
---

# Security Instructions

## Input validation

- Walk-button direction values MUST be validated against the `DIRECTIONS` constant before use.
  Already enforced in `pedestrian.ts` — do not remove this guard.
- Never pass unvalidated user input to canvas text rendering functions.
- Validate all numeric speed-multiplier values against the `SPEED_MULTIPLIERS` whitelist.

## Forbidden patterns

- No `eval()`, `new Function()`, or dynamic script injection.
- No `innerHTML` assignment anywhere in the codebase.
- No `dangerouslySetInnerHTML` in React components.
- No external URLs constructed from user input.

## Canvas safety

- Canvas `fillText` / `strokeText` calls must only receive literal strings or
  values derived from validated enums — never raw user input.
- The simulation canvas is a pure render target; it reads no cookies, tokens, or localStorage.

## Dependency hygiene

- Run `npm audit` before shipping. Address any high/critical findings.
- Keep React and Vite on current patch releases.
