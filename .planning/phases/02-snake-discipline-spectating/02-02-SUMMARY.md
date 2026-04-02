---
phase: 02-snake-discipline-spectating
plan: 02
subsystem: api
tags: [match-runner, isolated-vm, redis, sandbox, hono, drizzle, jsonb]

requires:
  - phase: 02-snake-discipline-spectating
    provides: "Snake engine (createSnakeEngine), Zod schemas, starter agent template"
  - phase: 01-foundation
    provides: "API server, auth middleware, agent schema, sandbox execution, esbuild compiler"
provides:
  - "Matches DB table with status, frames JSONB, config, scores"
  - "MatchSandbox class that reuses isolate across ticks (performance-critical)"
  - "runMatch service orchestrating engine + sandbox + frame recording"
  - "Redis pub/sub match broadcaster with no-op fallback"
  - "Match API endpoints: POST /matches, GET /matches/:id, GET /matches"
affects: [02-03, spectator-frontend, replay-viewer, match-history]

tech-stack:
  added: [ioredis, "@hono/node-ws"]
  patterns: [reusable-isolate-sandbox, inline-match-execution, json-stringify-in-isolate]

key-files:
  created:
    - packages/db/src/schema/matches.ts
    - packages/engine/src/match-sandbox.ts
    - packages/api/src/services/match-runner.ts
    - packages/api/src/services/match-broadcaster.ts
    - packages/api/src/routes/matches.ts
    - packages/engine/src/__tests__/match-sandbox.test.ts
    - packages/engine/src/__tests__/starter-agent.test.ts
    - packages/api/src/__tests__/match-runner.test.ts
  modified:
    - packages/db/src/schema/index.ts
    - packages/engine/src/index.ts
    - packages/engine/package.json
    - packages/api/package.json
    - packages/api/src/index.ts
    - docker-compose.yml

key-decisions:
  - "MatchSandbox uses JSON.stringify inside isolate to transfer complex objects (isolated-vm can only return primitives from script.run)"
  - "Engine package needed exports field in package.json for Vite module resolution"
  - "Match execution runs inline in POST handler (BullMQ deferred to future gap closure)"

patterns-established:
  - "Reusable isolate pattern: compile agent once, call move() repeatedly with state injection"
  - "JSON serialization bridge: stringify inside isolate, parse outside for object transfer"
  - "Graceful degradation: no-op broadcaster when Redis unavailable"

requirements-completed: [GAME-01, GAME-03, SPEC-02]

duration: 8min
completed: 2026-04-03
---

# Phase 2 Plan 2: Match Execution Pipeline Summary

**Match execution pipeline from API to stored result: MatchSandbox with isolate reuse, runMatch service with frame recording, Redis broadcaster, and match CRUD endpoints**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-02T23:32:25Z
- **Completed:** 2026-04-02T23:40:00Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- MatchSandbox class reuses a single isolated-vm isolate across all ticks for performance
- Full match execution pipeline: API request -> engine + sandbox loop -> frames stored in PostgreSQL
- Match API endpoints with authentication and owner validation
- 9 new tests covering sandbox reuse, starter agent integration, full match execution, and crash handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Match infrastructure -- DB schema, MatchSandbox, Redis, match runner service** - `1d661c9` (feat)
2. **Task 2: Match API endpoints -- start match, get result, list matches** - `7c2e8cb` (feat)

## Files Created/Modified
- `packages/db/src/schema/matches.ts` - Matches table with status, frames JSONB, config, scores
- `packages/engine/src/match-sandbox.ts` - MatchSandbox class reusing isolate across ticks
- `packages/api/src/services/match-runner.ts` - Orchestrates engine + sandbox + frame recording
- `packages/api/src/services/match-broadcaster.ts` - Redis pub/sub with no-op fallback
- `packages/api/src/routes/matches.ts` - POST/GET/LIST match endpoints with auth
- `packages/engine/src/__tests__/match-sandbox.test.ts` - 3 tests for sandbox reuse and disposal
- `packages/engine/src/__tests__/starter-agent.test.ts` - 2 tests for starter agent in sandbox
- `packages/api/src/__tests__/match-runner.test.ts` - 4 tests for full match execution
- `docker-compose.yml` - Added Redis container

## Decisions Made
- MatchSandbox uses `JSON.stringify` inside the isolate to transfer move results (isolated-vm's `script.run()` can only return primitives, not complex objects)
- Added `exports` field to engine `package.json` for Vite/vitest module resolution (was missing, causing import failures)
- Tests append `export { move }` to starter agent source so esbuild preserves the function (without export, esbuild tree-shakes it away)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed isolated-vm object transfer via JSON serialization**
- **Found during:** Task 1 (MatchSandbox implementation)
- **Issue:** `script.run()` in isolated-vm returns `null` for complex objects (objects cannot cross isolate boundary directly)
- **Fix:** Used `JSON.stringify(move(__gameState__))` inside isolate, `JSON.parse()` outside
- **Files modified:** packages/engine/src/match-sandbox.ts
- **Verification:** All 3 match-sandbox tests pass, objects correctly transferred
- **Committed in:** 1d661c9 (Task 1 commit)

**2. [Rule 3 - Blocking] Added exports field to engine package.json**
- **Found during:** Task 1 (match-runner test resolution)
- **Issue:** Vite could not resolve `@repo/engine` package -- missing `exports` field in package.json
- **Fix:** Added `"exports": { ".": "./src/index.ts" }` matching the shared package pattern
- **Files modified:** packages/engine/package.json
- **Verification:** `npx vitest run` resolves @repo/engine imports, `npx turbo build` succeeds
- **Committed in:** 1d661c9 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for isolated-vm object transfer and module resolution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
Redis container added to docker-compose.yml. Run `docker compose up -d` to start Redis alongside PostgreSQL.

## Next Phase Readiness
- Match execution pipeline complete, ready for WebSocket spectating (Plan 02-03)
- Match broadcaster publishes frames to Redis channels for live streaming
- Replay data stored in PostgreSQL JSONB, retrievable via GET endpoint
- All types exported from @repo/engine and @repo/shared for downstream consumption

---
*Phase: 02-snake-discipline-spectating*
*Completed: 2026-04-03*
