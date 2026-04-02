---
phase: 1
slug: foundation-and-agent-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | none — Wave 0 must create `vitest.config.ts` at root |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx turbo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --changed`
- **After every plan wave:** Run `npx turbo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | INFRA | unit | `npx vitest run --reporter=verbose` | No — W0 creates | ⬜ pending |
| 01-02-01 | 02 | 1 | AUTH-01 | integration | `npx vitest run packages/api/src/__tests__/auth-email.test.ts -t "sign up"` | No — W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | AUTH-02 | integration | `npx vitest run packages/api/src/__tests__/auth-session.test.ts -t "session persist"` | No — W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | AUTH-03 | integration | `npx vitest run packages/api/src/__tests__/api-keys.test.ts -t "create key"` | No — W0 | ⬜ pending |
| 01-02-04 | 02 | 1 | AUTH-04 | integration | `npx vitest run packages/api/src/__tests__/auth-github.test.ts -t "github oauth"` | No — W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | AGNT-01 | integration | `npx vitest run packages/api/src/__tests__/agent-upload.test.ts -t "upload agent"` | No — W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | AGNT-02 | integration | `npx vitest run packages/api/src/__tests__/agent-github.test.ts -t "link github"` | No — W0 | ⬜ pending |
| 01-03-03 | 03 | 2 | SANDBOX | unit | `npx vitest run packages/engine/src/__tests__/sandbox.test.ts` | No — W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — root Vitest config with workspace support
- [ ] `packages/api/vitest.config.ts` — API package test config
- [ ] `packages/engine/vitest.config.ts` — Engine package test config
- [ ] `packages/api/src/__tests__/setup.ts` — Test database setup/teardown
- [ ] `docker-compose.test.yml` — Test PostgreSQL container
- [ ] Framework install: `npm install -D vitest @vitest/coverage-v8`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub OAuth flow | AUTH-04 | Requires real GitHub OAuth redirect | 1. Click "Sign in with GitHub" 2. Authorize app 3. Verify redirect back with session |
| Session persists across refresh | AUTH-02 | Browser cookie behavior | 1. Sign in 2. Refresh page 3. Verify still signed in |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
