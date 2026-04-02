---
phase: 01-foundation-and-agent-pipeline
plan: 02
subsystem: auth
tags: [better-auth, hono, drizzle, api-key, github-oauth, tailwindcss, next.js, vitest]

# Dependency graph
requires:
  - 01-01
provides:
  - Better Auth server with email/password, GitHub OAuth, and API key plugins
  - Hono auth routes at /api/auth/* with session and API key middleware
  - requireAuth middleware supporting session cookies and API key bearer tokens
  - Next.js auth pages (sign-in, sign-up, dashboard, settings)
  - API key management UI (create, list, copy, revoke)
  - Better Auth React client with apiKey plugin
affects: [01-03, 02-01]

# Tech tracking
tech-stack:
  added: [better-auth, @better-auth/api-key, tailwindcss 4, @tailwindcss/postcss, postcss]
  patterns: [better-auth-drizzle-adapter, hono-auth-handler-mount, session-then-apikey-auth-chain, auth-client-baseurl-pattern]

key-files:
  created:
    - packages/api/src/auth.ts
    - packages/api/src/routes/auth.ts
    - packages/api/src/middleware/auth.ts
    - packages/api/src/__tests__/setup.ts
    - packages/api/src/__tests__/auth-email.test.ts
    - packages/api/src/__tests__/auth-session.test.ts
    - packages/api/src/__tests__/api-keys.test.ts
    - packages/api/src/__tests__/auth-github.test.ts
    - packages/db/src/schema/verification.ts
    - apps/web/src/lib/auth-client.ts
    - apps/web/src/components/auth-form.tsx
    - apps/web/src/components/api-key-manager.tsx
    - apps/web/src/app/(auth)/layout.tsx
    - apps/web/src/app/(auth)/sign-in/page.tsx
    - apps/web/src/app/(auth)/sign-up/page.tsx
    - apps/web/src/app/dashboard/page.tsx
    - apps/web/src/app/settings/page.tsx
    - apps/web/src/app/globals.css
    - apps/web/postcss.config.mjs
  modified:
    - packages/api/src/index.ts
    - packages/api/package.json
    - packages/db/src/schema/api-keys.ts
    - packages/db/src/schema/index.ts
    - packages/db/package.json
    - apps/web/package.json
    - apps/web/src/app/layout.tsx
    - vitest.config.ts
    - package.json

key-decisions:
  - "Better Auth API key plugin uses referenceId (not userId) for user association -- middleware checks both fields"
  - "Added verification table required by Better Auth for OAuth state management"
  - "apikey schema updated: added configId and referenceId columns, made userId nullable for plugin compatibility"
  - "Tailwind CSS v4 with @tailwindcss/postcss plugin (CSS-based config, no tailwind.config.js)"
  - "Tests run sequentially (fileParallelism: false) to avoid DB conflicts with shared PostgreSQL"
  - "drizzle-orm hoisted to root node_modules for @better-auth/drizzle-adapter resolution"
  - "Added @repo/db/schema export path for schema-only imports without triggering DB client initialization"

patterns-established:
  - "Auth handler mount: app.all('/api/auth/*', (c) => auth.handler(c.req.raw))"
  - "Auth middleware: session cookie first, API key bearer fallback, 401 if neither"
  - "Test setup: dedicated test auth instance with in-memory secret and test DB, TRUNCATE CASCADE between tests"
  - "Auth client: createAuthClient from better-auth/react with baseURL pointing to API server"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

# Metrics
duration: 21min
completed: 2026-04-02
---

# Phase 1 Plan 02: Authentication System Summary

**Better Auth with email/password + GitHub OAuth + API key management on Hono API, with Next.js sign-in/sign-up/dashboard/settings pages and 11 integration tests**

## Performance

- **Duration:** 21 min
- **Started:** 2026-04-02T11:49:45Z
- **Completed:** 2026-04-02T12:10:45Z
- **Tasks:** 2
- **Files modified:** 31

## Accomplishments
- Complete auth system: email sign-up/sign-in, GitHub OAuth redirect, API key CRUD, session management
- 11 integration tests covering email auth (3), sessions (4), API keys (3), GitHub OAuth (1) -- all passing
- Next.js frontend with 5 routes: sign-in, sign-up, dashboard, settings, home
- Full turbo build passes (5/5 tasks)

## Task Commits

Each task was committed atomically:

1. **Task 1: Better Auth server + Hono routes + auth middleware + tests** - `a93f256` (feat)
2. **Task 2: Next.js auth pages and API key management UI** - `a664c18` (feat)
3. **Dependency fix: drizzle-orm root hoisting** - `e7098ec` (fix)

## Files Created/Modified
- `packages/api/src/auth.ts` - Better Auth server instance with drizzle adapter, email/password, GitHub OAuth, API key plugins
- `packages/api/src/routes/auth.ts` - Hono router mounting auth.handler on /api/auth/*
- `packages/api/src/middleware/auth.ts` - requireAuth middleware (session cookie + API key bearer)
- `packages/api/src/index.ts` - Updated Hono app to mount auth routes
- `packages/api/src/__tests__/setup.ts` - Test infrastructure with test auth instance, helpers, DB cleanup
- `packages/api/src/__tests__/auth-email.test.ts` - Email sign-up/sign-in tests
- `packages/api/src/__tests__/auth-session.test.ts` - Session persistence and middleware protection tests
- `packages/api/src/__tests__/api-keys.test.ts` - API key creation and verification tests
- `packages/api/src/__tests__/auth-github.test.ts` - GitHub OAuth redirect URL test
- `packages/db/src/schema/api-keys.ts` - Updated with configId, referenceId for Better Auth compatibility
- `packages/db/src/schema/verification.ts` - New table for OAuth state management
- `apps/web/src/lib/auth-client.ts` - Better Auth React client with apiKey plugin
- `apps/web/src/components/auth-form.tsx` - Reusable auth form (email/password + GitHub)
- `apps/web/src/components/api-key-manager.tsx` - API key create/list/revoke UI
- `apps/web/src/app/(auth)/sign-in/page.tsx` - Sign-in page
- `apps/web/src/app/(auth)/sign-up/page.tsx` - Sign-up page
- `apps/web/src/app/dashboard/page.tsx` - Protected dashboard with session check
- `apps/web/src/app/settings/page.tsx` - API key management settings page

## Decisions Made
- Better Auth API key plugin uses `referenceId` not `userId` for user association -- middleware checks both
- Added `verification` table for OAuth state (required by Better Auth social providers)
- Updated apikey schema with `configId` (default: "default") and `referenceId` columns, made `userId` nullable
- Tailwind CSS v4 with CSS-based config (@import "tailwindcss") instead of tailwind.config.js
- Tests run sequentially to avoid shared PostgreSQL conflicts
- Added `@repo/db/schema` export path to import schema without triggering DB client

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added verification table for OAuth**
- **Found during:** Task 1 (GitHub OAuth test)
- **Issue:** Better Auth social providers require a "verification" table for OAuth state management
- **Fix:** Created `packages/db/src/schema/verification.ts` with id, identifier, value, expiresAt, createdAt, updatedAt
- **Files modified:** packages/db/src/schema/verification.ts, packages/db/src/schema/index.ts
- **Verification:** GitHub OAuth test passes
- **Committed in:** a93f256 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed apikey schema for Better Auth API key plugin**
- **Found during:** Task 1 (API key tests)
- **Issue:** API key plugin requires `configId` and `referenceId` columns; also uses `referenceId` (not `userId`) for user mapping, causing NOT NULL constraint violations
- **Fix:** Added configId and referenceId columns, changed userId to nullable, updated middleware to check both referenceId and userId
- **Files modified:** packages/db/src/schema/api-keys.ts, packages/api/src/middleware/auth.ts
- **Verification:** API key creation and verification tests pass
- **Committed in:** a93f256 (Task 1 commit)

**3. [Rule 3 - Blocking] Fixed drizzle-orm module resolution for better-auth adapter**
- **Found during:** Final verification after Task 2
- **Issue:** @better-auth/drizzle-adapter at root node_modules could not find drizzle-orm (was only in packages/db/node_modules)
- **Fix:** Installed drizzle-orm and postgres at root level
- **Files modified:** package.json, package-lock.json
- **Verification:** All 11 tests pass after reinstall
- **Committed in:** e7098ec (separate fix commit)

**4. [Rule 3 - Blocking] Added @repo/db/schema export for schema-only imports**
- **Found during:** Task 1 (test setup)
- **Issue:** Importing `@repo/db` triggers DB client initialization requiring DATABASE_URL; tests need schema without client
- **Fix:** Added `"./schema"` export mapping in packages/db/package.json
- **Files modified:** packages/db/package.json
- **Verification:** Tests import schema without DATABASE_URL errors
- **Committed in:** a93f256 (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (1 bug, 3 blocking)
**Impact on plan:** All fixes necessary for Better Auth plugin compatibility. No scope creep.

## Issues Encountered
- Better Auth API key plugin uses `referenceId` instead of `userId` -- required schema investigation to discover the actual column mapping
- Test file parallelism caused unique constraint violations on shared DB -- fixed with `fileParallelism: false`
- npm workspace hoisting placed drizzle-orm only under packages/db -- needed explicit root install for @better-auth/drizzle-adapter

## User Setup Required

GitHub OAuth requires manual configuration:
- Create GitHub OAuth App at Settings > Developer settings > OAuth Apps
- Set callback URL to `http://localhost:3001/api/auth/callback/github`
- Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`
- Email/password auth works without any external configuration

## Next Phase Readiness
- Auth system fully functional for Plan 03 (Agent Upload Pipeline)
- Protected endpoints use `requireAuth` middleware
- API key auth enables programmatic agent uploads
- Dashboard shell ready for agent management UI extension

## Self-Check: PASSED

- All 17 key files verified present
- All 3 task commits (a93f256, a664c18, e7098ec) verified in git log
- 11/11 integration tests pass
- turbo build: 5/5 tasks successful
- Next.js routes: 5 (/, /sign-in, /sign-up, /dashboard, /settings)

---
*Phase: 01-foundation-and-agent-pipeline*
*Completed: 2026-04-02*
