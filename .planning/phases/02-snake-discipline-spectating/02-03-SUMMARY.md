---
phase: 02-snake-discipline-spectating
plan: 03
subsystem: frontend
tags: [pixi.js, websocket, spectating, replay, hono-ws, redis-subscribe, next-dynamic]

requires:
  - phase: 02-snake-discipline-spectating
    provides: "Match execution pipeline, Redis broadcaster, match API endpoints, SnakeFrame types"
  - phase: 01-foundation
    provides: "API server, auth middleware, Next.js web app with Tailwind"
provides:
  - "WebSocket spectating endpoint with per-connection Redis subscriber"
  - "PixiJS 8 snake game renderer with grid, snake, food visualization"
  - "Decision overlay showing agent reasoning during spectating"
  - "Replay controls with play/pause/step/scrub"
  - "Match listing and detail pages with status-aware views"
affects: [future-disciplines, tournament-viewer, public-spectating]

tech-stack:
  added: [pixi.js]
  patterns: [dynamic-import-ssr-false, ws-redis-subscriber-per-connection, canvas-graphics-redraw]

key-files:
  created:
    - packages/api/src/routes/spectate.ts
    - apps/web/src/components/game/snake-renderer.tsx
    - apps/web/src/components/game/game-canvas.tsx
    - apps/web/src/components/game/decision-overlay.tsx
    - apps/web/src/components/game/replay-controls.tsx
    - apps/web/src/app/matches/page.tsx
    - apps/web/src/app/matches/[id]/page.tsx
    - packages/api/src/__tests__/spectate-ws.test.ts
    - packages/api/src/__tests__/replay.test.ts
  modified:
    - packages/api/src/index.ts
    - apps/web/package.json

key-decisions:
  - "CORS scoped to /api/* only to avoid WebSocket upgrade header conflicts"
  - "PixiJS loaded via next/dynamic with ssr: false to prevent server-side rendering errors"
  - "Each WebSocket connection creates its own ioredis subscriber (required by ioredis subscribe mode)"
  - "Spectate route uses generic WSEvents type to avoid DTS build errors with @hono/node-ws"

patterns-established:
  - "Dynamic import pattern: next/dynamic with ssr: false for browser-only libraries"
  - "WebSocket-Redis bridge: one subscriber per client connection, auto-cleanup on disconnect"
  - "PixiJS Graphics redraw pattern: clear + rebuild on frame change for game state rendering"

requirements-completed: [SPEC-01, SPEC-02, SPEC-03]

duration: 6min
completed: 2026-04-03
---

# Phase 2 Plan 3: Spectating Layer Summary

**WebSocket live spectating with PixiJS 8 snake renderer, decision overlay showing agent reasoning, and replay controls with play/pause/step/scrub**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-02T23:43:46Z
- **Completed:** 2026-04-02T23:49:34Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 11

## Accomplishments
- WebSocket spectating endpoint at /ws/matches/:matchId/spectate with Redis subscriber per connection
- PixiJS 8 canvas rendering snake game state with grid lines, snake body/head, and food
- Decision overlay showing tick, score, agent move direction, and reasoning text
- Replay controls with play/pause/step forward-backward/scrub and frame counter
- GameCanvas supporting both live (WebSocket) and replay (static frames) modes
- Match listing page with start-new-match button and match detail page with status-aware views

## Task Commits

Each task was committed atomically:

1. **Task 1: WebSocket spectating endpoint with Redis subscription** - `1559a18` (feat)
2. **Task 2: PixiJS renderer, decision overlay, replay controls, and match pages** - `4b3aae1` (feat)

## Files Created/Modified
- `packages/api/src/routes/spectate.ts` - WebSocket endpoint with Redis subscriber for live frame delivery
- `packages/api/src/index.ts` - CORS scoped to /api/*, WebSocket support via @hono/node-ws
- `packages/api/src/__tests__/spectate-ws.test.ts` - 3 tests for spectate route setup and handlers
- `packages/api/src/__tests__/replay.test.ts` - 4 tests for replay route structure and data shape
- `apps/web/src/components/game/snake-renderer.tsx` - PixiJS 8 canvas rendering snake game
- `apps/web/src/components/game/game-canvas.tsx` - Dynamic import wrapper with live/replay modes
- `apps/web/src/components/game/decision-overlay.tsx` - Agent reasoning overlay
- `apps/web/src/components/game/replay-controls.tsx` - Play/pause/step/scrub controls
- `apps/web/src/app/matches/page.tsx` - Match listing with start-new-match
- `apps/web/src/app/matches/[id]/page.tsx` - Match detail with status-aware game view
- `apps/web/package.json` - Added pixi.js dependency

## Decisions Made
- CORS middleware scoped to `/api/*` only (was `*`) to prevent CORS headers from interfering with WebSocket upgrade handshake
- PixiJS loaded via `next/dynamic` with `{ ssr: false }` to avoid server-side rendering of browser-only canvas APIs
- Each WebSocket connection creates its own ioredis subscriber instance (ioredis requires dedicated connections for subscribe mode)
- Used generic `WSEvents` type for spectate route factory to resolve tsup DTS build errors with @hono/node-ws type exports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed UpgradeWebSocket type for DTS build compatibility**
- **Found during:** Task 2 (build verification)
- **Issue:** Custom `UpgradeWebSocket` type in spectate.ts was incompatible with the actual type from `@hono/node-ws`, causing tsup DTS build failure
- **Fix:** Changed to generic `(createEvents: (c: any) => WSEvents) => any` type signature
- **Files modified:** packages/api/src/routes/spectate.ts
- **Verification:** `npx turbo build` succeeds for all 5 packages
- **Committed in:** 4b3aae1 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for build compatibility. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - PixiJS is a client-side dependency with no external configuration.

## Next Phase Readiness
- Phase 2 complete: Snake spec, engine, match pipeline, and spectating all functional
- Human verification pending (Task 3 checkpoint) to confirm visual experience
- Ready for Phase 3 after verification

---
*Phase: 02-snake-discipline-spectating*
*Completed: 2026-04-03*
