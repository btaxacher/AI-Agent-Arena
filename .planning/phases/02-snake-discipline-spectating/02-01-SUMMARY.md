---
phase: 02-snake-discipline-spectating
plan: 01
subsystem: engine
tags: [zod, json-schema, snake, prando, determinism, game-engine]

requires:
  - phase: 01-foundation
    provides: "TypeScript compiler, sandbox execution, shared type exports"
provides:
  - "Zod schemas for SnakeGameState and SnakeMove (single source of truth)"
  - "JSON Schema generation from Zod (snake.json)"
  - "Starter agent template with greedy food-chasing"
  - "Deterministic tick-based Snake engine using prando PRNG"
  - "Match metadata types (MatchStatus, TerminationReason, MatchMetadata)"
affects: [02-02, 02-03, match-runner, spectator, replay]

tech-stack:
  added: [zod-to-json-schema, prando]
  patterns: [zod-as-source-of-truth, seeded-prng-determinism, factory-function-engine]

key-files:
  created:
    - packages/shared/src/specs/snake.schema.ts
    - packages/shared/src/specs/snake.json
    - packages/shared/src/specs/snake-starter.ts
    - packages/shared/src/types/match.ts
    - packages/shared/src/types/snake.ts
    - packages/engine/src/disciplines/snake/engine.ts
    - packages/engine/src/disciplines/snake/rules.ts
    - packages/engine/src/disciplines/snake/types.ts
    - packages/engine/src/disciplines/snake/__tests__/engine.test.ts
    - packages/engine/src/disciplines/snake/__tests__/determinism.test.ts
    - packages/shared/src/specs/__tests__/snake-schema.test.ts
  modified:
    - packages/shared/src/index.ts
    - packages/engine/src/index.ts
    - packages/shared/package.json
    - packages/engine/package.json

key-decisions:
  - "Used Zod v4 built-in toJSONSchema instead of zod-to-json-schema (v3 incompatible with Zod v4)"
  - "Prando imported via require() with CJS/ESM interop wrapper to fix tsup DTS build errors"
  - "Engine uses factory function pattern (createSnakeEngine) matching existing codebase conventions"

patterns-established:
  - "Zod schema as single source of truth: define schema, infer types, generate JSON Schema"
  - "Deterministic engine pattern: seeded PRNG + integer arithmetic + frame-based output"
  - "Discipline directory structure: packages/engine/src/disciplines/{name}/"

requirements-completed: [GAME-01, GAME-03]

duration: 8min
completed: 2026-04-03
---

# Phase 2 Plan 1: Snake Spec and Engine Summary

**Zod-based Snake game specification with deterministic tick engine using prando PRNG, 23 tests proving correctness and determinism**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-02T23:21:00Z
- **Completed:** 2026-04-02T23:29:26Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Snake game specification fully defined via Zod schemas with automatic JSON Schema generation
- Deterministic Snake engine with wall/self collision, food spawning, scoring, direction validation
- Starter agent template with greedy Manhattan-distance food chasing
- 23 tests covering schema validation, engine mechanics, and determinism verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Snake specification** - `8e392b9` (feat)
2. **Task 2: Deterministic Snake engine** - `bda1341` (feat)

## Files Created/Modified
- `packages/shared/src/specs/snake.schema.ts` - Zod schemas for SnakeGameState and SnakeMove, JSON Schema exports
- `packages/shared/src/specs/snake.json` - Generated JSON Schema file for external tools
- `packages/shared/src/specs/snake-starter.ts` - Greedy food-chasing starter agent source
- `packages/shared/src/types/match.ts` - MatchStatus, TerminationReason, MatchMetadata types
- `packages/shared/src/types/snake.ts` - Re-exports of Snake types for convenience
- `packages/engine/src/disciplines/snake/engine.ts` - Deterministic tick-based Snake engine
- `packages/engine/src/disciplines/snake/rules.ts` - Default config and direction constants
- `packages/engine/src/disciplines/snake/types.ts` - SnakeGameConfig, SnakeFrame, SnakeEngine interfaces
- `packages/engine/src/disciplines/snake/__tests__/engine.test.ts` - 9 engine tests
- `packages/engine/src/disciplines/snake/__tests__/determinism.test.ts` - 2 determinism tests
- `packages/shared/src/specs/__tests__/snake-schema.test.ts` - 12 schema tests

## Decisions Made
- Used Zod v4 built-in `toJSONSchema` instead of `zod-to-json-schema` library (the library produces empty output with Zod v4)
- Prando imported via `require()` with CJS/ESM interop wrapper to resolve tsup DTS build errors with default export
- Engine uses factory function pattern (`createSnakeEngine`) consistent with project conventions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed prando CJS/ESM import incompatibility**
- **Found during:** Task 2 (Engine implementation)
- **Issue:** `import Prando from "prando"` caused tsup DTS build error: "Cannot use namespace 'Prando' as a type"
- **Fix:** Used `require("prando")` with runtime CJS/ESM detection and a typed `Rng` interface
- **Files modified:** packages/engine/src/disciplines/snake/engine.ts
- **Verification:** `npx turbo build` succeeds, all 23 tests pass
- **Committed in:** bda1341 (Task 2 commit)

**2. [Rule 3 - Blocking] Used Zod v4 native toJSONSchema instead of zod-to-json-schema**
- **Found during:** Task 1 (Schema implementation)
- **Issue:** `zod-to-json-schema` v3.25 produces empty JSON Schema output with Zod v4
- **Fix:** Used `z.toJSONSchema()` from Zod v4 built-in API
- **Files modified:** packages/shared/src/specs/snake.schema.ts
- **Verification:** JSON Schema output has correct $schema, type, and properties fields
- **Committed in:** 8e392b9 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary to resolve library compatibility issues. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Snake spec and engine ready for match runner integration (Plan 02-02)
- Starter agent can be compiled and executed in sandbox with engine
- All types exported from @repo/shared and @repo/engine for downstream consumption

---
*Phase: 02-snake-discipline-spectating*
*Completed: 2026-04-03*
