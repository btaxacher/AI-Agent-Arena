# Roadmap: AI Agent Arena

## Overview

AI Agent Arena delivers a competitive platform where users upload TypeScript AI agents that compete in game disciplines, with live spectating and replay as core features. The roadmap progresses from proving the highest-risk technical component (sandboxed agent execution) through building the first complete game loop (Snake + spectating), adding competition infrastructure (challenges, leaderboards, agent management), and finally validating the plugin architecture with a second discipline (Territory War) while shipping the programmatic API for Claude Code integration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation and Agent Pipeline** - User accounts, agent upload, sandboxed execution proof-of-concept, monorepo and database setup (completed 2026-04-02)
- [ ] **Phase 2: Snake Discipline and Spectating** - Game engine, Snake game, machine-readable specs, replay viewer, live spectating
- [ ] **Phase 3: Competition Infrastructure** - Challenge system, leaderboards, match history, agent versioning and stats, house bots
- [ ] **Phase 4: Territory War and Programmatic API** - Second discipline (PvP), REST API for Claude Code integration

## Phase Details

### Phase 1: Foundation and Agent Pipeline
**Goal**: Users can create accounts and upload TypeScript agents that execute safely in a sandbox
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AGNT-01, AGNT-02
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password and sign in with GitHub, and their session persists across browser refresh
  2. User can generate an API key from their account settings
  3. User can upload a TypeScript agent file through the web UI
  4. User can link an agent from a GitHub repository URL
  5. An uploaded agent executes inside an isolated-vm sandbox with CPU/memory limits enforced (verified by a test that attempts resource exhaustion)
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Monorepo scaffold, Docker Compose PostgreSQL, DB schema, shared types
- [ ] 01-02-PLAN.md — Better Auth system (email/password, GitHub OAuth, API keys) + Next.js auth UI
- [ ] 01-03-PLAN.md — Agent upload pipeline (file + GitHub link) + isolated-vm sandbox POC

### Phase 2: Snake Discipline and Spectating
**Goal**: Users can run their agent in a Snake game and watch the match live or as a replay
**Depends on**: Phase 1
**Requirements**: GAME-01, GAME-03, SPEC-01, SPEC-02, SPEC-03
**Success Criteria** (what must be TRUE):
  1. User can start a Snake match with their uploaded agent and see it play on a rendered game canvas (PixiJS)
  2. User can watch a running Snake match live via WebSocket with sub-second state updates
  3. User can watch a completed Snake match as a replay from start to finish
  4. User can see a decision overlay during spectating that shows high-level agent actions
  5. Machine-readable Snake specification (TypeScript interfaces + JSON Schema) exists and a starter agent generated from the spec compiles and runs successfully
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Competition Infrastructure
**Goal**: Users can challenge each other, track performance, and compete on leaderboards
**Depends on**: Phase 2
**Requirements**: MTCH-01, MTCH-02, MTCH-03, RANK-01, RANK-02, AGNT-03, AGNT-04, GAME-04
**Success Criteria** (what must be TRUE):
  1. User can send a challenge to another account and the challenged user can accept or decline
  2. User can view their match history with scores, duration, and winner per match
  3. User can view a per-discipline leaderboard sorted by ELO rating
  4. User can view a public agent profile page showing win/loss stats and match history
  5. User can manage multiple versions of their agent and see performance stats per version
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Territory War and Programmatic API
**Goal**: Users can compete agent-vs-agent in Territory War and manage everything programmatically via REST API
**Depends on**: Phase 3
**Requirements**: GAME-02, INTG-01
**Success Criteria** (what must be TRUE):
  1. Two users can compete in a Territory War match where their agents fight for area control on a grid, with live spectating and replay working identically to Snake
  2. Territory War has its own leaderboard, starter kit, and machine-readable spec
  3. An external tool (Claude Code) can upload an agent, search for matches, retrieve results, and read discipline specs entirely through the REST API without touching the UI
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Agent Pipeline | 3/3 | Complete   | 2026-04-02 |
| 2. Snake Discipline and Spectating | 0/3 | Not started | - |
| 3. Competition Infrastructure | 0/3 | Not started | - |
| 4. Territory War and Programmatic API | 0/2 | Not started | - |
