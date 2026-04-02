---
phase: 01-foundation-and-agent-pipeline
plan: 03
subsystem: agent-pipeline
tags: [esbuild, isolated-vm, sandbox, hono, drizzle, vitest, agent-upload, github-api]

# Dependency graph
requires:
  - 01-01
  - 01-02
provides:
  - Agent upload API (POST /agents/upload) with esbuild TypeScript compilation
  - GitHub agent linking API (POST /agents/github-link) fetching from raw.githubusercontent.com
  - Agent CRUD routes (list, get, soft-delete) with requireAuth middleware
  - isolated-vm sandbox with enforced CPU timeout and memory limits
  - Engine-local TypeScript compiler (same esbuild config as API)
  - Frontend agent management pages (list, upload with tabs)
affects: [02-01, 02-02]

# Tech tracking
tech-stack:
  added: [esbuild, isolated-vm]
  patterns: [route-factory-pattern, esm-to-script-transform, sandbox-global-cleanup, dynamic-db-import]

key-files:
  created:
    - packages/api/src/services/agent-compiler.ts
    - packages/api/src/services/agent-github.ts
    - packages/api/src/routes/agents.ts
    - packages/api/src/__tests__/agent-upload.test.ts
    - packages/api/src/__tests__/agent-github.test.ts
    - packages/engine/src/sandbox.ts
    - packages/engine/src/compiler.ts
    - packages/engine/src/__tests__/sandbox.test.ts
    - packages/engine/src/__tests__/compiler.test.ts
    - apps/web/src/app/agents/page.tsx
    - apps/web/src/app/agents/upload/page.tsx
    - apps/web/src/components/agent-upload-form.tsx
    - apps/web/src/components/agent-github-link-form.tsx
    - apps/web/src/components/agent-list.tsx
  modified:
    - packages/api/src/index.ts
    - packages/api/src/__tests__/setup.ts
    - packages/api/package.json
    - packages/engine/src/index.ts
    - packages/engine/package.json
    - vitest.config.ts
    - package-lock.json

key-decisions:
  - "Agent routes use factory pattern (createAgentRoutes) accepting auth middleware for testable injection"
  - "ESM export statements stripped from esbuild output for isolated-vm script compatibility"
  - "Sandbox cleans globalThis (console, setTimeout, setInterval) before agent execution"
  - "vitest config loads .env via Vite loadEnv to provide DATABASE_URL for tests"
  - "Agent routes use dynamic import('@repo/db') to avoid DATABASE_URL requirement at module load"

patterns-established:
  - "Route factory: createAgentRoutes(authMiddleware) for dependency-injected auth in tests"
  - "Sandbox execution: create isolate -> clean globals -> inject state -> run code -> dispose"
  - "ESM-to-script transform: strip export statements for non-module environments"
  - "Dynamic DB import: await import('@repo/db') in route handlers for lazy initialization"

requirements-completed: [AGNT-01, AGNT-02]

# Metrics
duration: 9min
completed: 2026-04-02
---

# Phase 1 Plan 03: Agent Upload Pipeline and Sandbox POC Summary

**Agent upload and GitHub linking with esbuild TS compilation, plus isolated-vm sandbox with validated CPU timeout and memory limits**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-02T12:14:29Z
- **Completed:** 2026-04-02T12:23:36Z
- **Tasks:** 2
- **Files modified:** 22

## Accomplishments
- Complete agent upload pipeline: TypeScript upload -> esbuild compile -> store in PostgreSQL
- GitHub agent linking: fetch from raw.githubusercontent.com -> compile -> store
- isolated-vm sandbox POC validated: infinite loops killed at 100ms timeout, memory bombs killed at 8MB limit
- 19 new tests (9 API + 10 engine), all 30 monorepo tests passing
- Frontend agent management UI with list page and tabbed upload/GitHub link forms

## Task Commits

Each task was committed atomically:

1. **Task 1: Agent upload pipeline + GitHub linking with esbuild compilation** - `418daf9` (feat)
2. **Task 2: isolated-vm sandbox proof-of-concept with resource limit validation** - `c9a390f` (feat)

## Files Created/Modified
- `packages/api/src/services/agent-compiler.ts` - esbuild TS-to-JS compilation (platform: neutral, format: esm)
- `packages/api/src/services/agent-github.ts` - Fetch agent source from GitHub raw URL
- `packages/api/src/routes/agents.ts` - Agent CRUD routes with factory pattern for auth injection
- `packages/api/src/__tests__/agent-upload.test.ts` - 7 tests: upload, validation, auth, listing, compilation
- `packages/api/src/__tests__/agent-github.test.ts` - 2 tests: GitHub link with mock fetch, invalid URL
- `packages/engine/src/sandbox.ts` - isolated-vm sandbox with TimeoutError/MemoryLimitError
- `packages/engine/src/compiler.ts` - Engine-local esbuild compiler
- `packages/engine/src/__tests__/sandbox.test.ts` - 8 tests: execution, timeout, memory, no-globals, metrics
- `packages/engine/src/__tests__/compiler.test.ts` - 2 tests: valid/invalid TS compilation
- `apps/web/src/app/agents/page.tsx` - Agent list page with delete
- `apps/web/src/app/agents/upload/page.tsx` - Tabbed upload page (Upload File / Link GitHub)
- `apps/web/src/components/agent-upload-form.tsx` - Name + file/code textarea + submit
- `apps/web/src/components/agent-github-link-form.tsx` - Name + repo URL + file path + submit
- `apps/web/src/components/agent-list.tsx` - Agent card grid with type badge and delete

## Decisions Made
- Agent routes use factory pattern (`createAgentRoutes(authMiddleware)`) to allow tests to inject test auth instance instead of production auth
- ESM `export` statements stripped from esbuild output for isolated-vm compatibility (isolated-vm runs scripts, not modules)
- Sandbox explicitly deletes `console`, `setTimeout`, `setInterval` from `globalThis` before agent execution
- vitest config uses Vite's `loadEnv` to load `.env` file, ensuring `DATABASE_URL` is available for all test runs
- Routes use `await import("@repo/db")` dynamically to avoid requiring `DATABASE_URL` at module load time

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed console access in isolated-vm sandbox**
- **Found during:** Task 2 (sandbox no-globals test)
- **Issue:** isolated-vm provides a `console` object by default in new contexts
- **Fix:** Added cleanup script that deletes `console`, `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval` from `globalThis` before agent code runs
- **Files modified:** packages/engine/src/sandbox.ts
- **Verification:** `typeof console` returns `"undefined"` in sandbox
- **Committed in:** c9a390f (Task 2 commit)

**2. [Rule 3 - Blocking] Added .env loading to vitest config**
- **Found during:** Task 1 (initial test run)
- **Issue:** Tests failed with "DATABASE_URL environment variable is required" because vitest doesn't load `.env` by default
- **Fix:** Added `env: loadEnv("test", process.cwd(), "")` to vitest config
- **Files modified:** vitest.config.ts
- **Verification:** All tests pass without manual DATABASE_URL export
- **Committed in:** 418daf9 (Task 1 commit)

**3. [Rule 3 - Blocking] Created route factory for test auth injection**
- **Found during:** Task 1 (test setup)
- **Issue:** Agent routes imported `requireAuth` which imports production `auth.ts` which uses a different secret than test auth -- session cookies from test auth couldn't be verified by production auth
- **Fix:** Refactored `agentRoutes` to `createAgentRoutes(authMiddleware)` factory pattern; tests pass `testRequireAuth` using the test auth instance
- **Files modified:** packages/api/src/routes/agents.ts, packages/api/src/__tests__/setup.ts
- **Verification:** All 9 agent API tests pass with test auth cookies
- **Committed in:** 418daf9 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for test infrastructure and security correctness. No scope creep.

## Issues Encountered
- isolated-vm installed successfully on Windows without needing fallback to QuickJS (C++ build tools were already available)
- esbuild ESM output requires post-processing for isolated-vm (script context, not module context)

## User Setup Required
None - all dependencies install via npm, PostgreSQL provided by Docker Compose.

## Next Phase Readiness
- Agent upload pipeline complete: users can upload TS agents or link from GitHub
- Sandbox validated: ready for game engine integration in Phase 2
- Full pipeline proven: upload TS -> compile via esbuild -> store compiled JS -> execute in sandbox -> return result
- Phase 1 complete: monorepo, auth, agent pipeline, sandbox all functional

## Self-Check: PASSED

- All 14 created files verified present
- Both task commits (418daf9, c9a390f) verified in git log
- 30/30 tests pass across monorepo
- turbo build: 5/5 tasks successful
- Next.js routes: 9 (/, /sign-in, /sign-up, /dashboard, /settings, /agents, /agents/upload, + existing)

---
*Phase: 01-foundation-and-agent-pipeline*
*Completed: 2026-04-02*
