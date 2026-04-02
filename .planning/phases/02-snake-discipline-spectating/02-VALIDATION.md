---
phase: 2
slug: snake-discipline-spectating
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` (exists at root) |
| **Quick run command** | `npx vitest run --changed` |
| **Full suite command** | `npx turbo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --changed`
- **After every plan wave:** Run `npx turbo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | GAME-01 | unit | `npx vitest run packages/engine/src/disciplines/snake/__tests__/engine.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | GAME-01 | unit | `npx vitest run packages/engine/src/disciplines/snake/__tests__/determinism.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | GAME-03 | unit | `npx vitest run packages/shared/src/specs/__tests__/snake-schema.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | GAME-01 | integration | `npx vitest run packages/api/src/__tests__/match-runner.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | GAME-03 | integration | `npx vitest run packages/engine/src/__tests__/starter-agent.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | SPEC-01 | integration | `npx vitest run packages/api/src/__tests__/spectate-ws.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | SPEC-02 | integration | `npx vitest run packages/api/src/__tests__/replay.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 2 | SPEC-03 | unit | `npx vitest run packages/engine/src/disciplines/snake/__tests__/engine.test.ts -t "reasoning"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/engine/src/disciplines/snake/__tests__/engine.test.ts` — core Snake engine tests (GAME-01)
- [ ] `packages/engine/src/disciplines/snake/__tests__/determinism.test.ts` — determinism verification (GAME-01)
- [ ] `packages/shared/src/specs/__tests__/snake-schema.test.ts` — schema generation tests (GAME-03)
- [ ] `packages/api/src/__tests__/match-runner.test.ts` — match execution integration test (GAME-01)
- [ ] `packages/api/src/__tests__/spectate-ws.test.ts` — WebSocket spectating test (SPEC-01)
- [ ] `packages/api/src/__tests__/replay.test.ts` — replay endpoint test (SPEC-02)
- [ ] `packages/engine/src/__tests__/starter-agent.test.ts` — starter agent compilation test (GAME-03)
- [ ] Redis added to docker-compose.yml for test environment
- [ ] `npm install prando @hono/node-ws bullmq ioredis zod-to-json-schema` in relevant packages
- [ ] `npm install pixi.js` in apps/web

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PixiJS canvas renders snake game visually | SPEC-01 | Visual rendering cannot be verified by unit tests | Start match, verify canvas shows grid, snake, and food |
| Decision overlay displays agent reasoning | SPEC-03 | UI overlay layout is visual | During spectating, verify overlay panel shows agent action labels |
| Live spectating feels responsive (<1s) | SPEC-01 | Latency perception is subjective | Watch live match, verify frame updates appear smooth |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
