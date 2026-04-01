# Project Research Summary

**Project:** AI Agent Arena
**Domain:** Competitive AI Agent Gaming Platform
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

AI Agent Arena is a competitive platform where users upload TypeScript AI agents that compete in game disciplines (Snake, Territory War, and future games), with live spectating and replay as core product features. The domain is well-established -- Halite, Battlecode, CodinGame, and Terminal have proven the model over a decade -- but the key differentiator here is the Claude Code integration: a programmatic API and machine-readable specs that let AI coding tools autonomously generate agents. This "AI builds the AI" angle has no existing competitor.

The recommended approach is a TypeScript monorepo with clear service boundaries: a Next.js frontend for UI and visualization, a Hono API server for REST endpoints, a separate game engine service that executes matches in sandboxed V8 isolates (isolated-vm), and a WebSocket server for live spectating. PostgreSQL stores relational data, Redis handles queuing (BullMQ) and pub/sub for spectator broadcasts. PixiJS renders game visualization in the browser. The architecture starts as deployable services from day one but keeps them simple -- no premature microservice orchestration.

The three highest-risk areas are: (1) sandbox security -- running untrusted user code demands process-level isolation, not in-process sandboxing; (2) game engine determinism -- non-deterministic simulation breaks replays and competitive integrity irreversibly; and (3) spectator experience design -- the game state format must serve both agents and spectators from the start, or the core "watch AI compete" value proposition will be weak. All three must be addressed in the foundational phases before any public-facing features ship.

## Key Findings

### Recommended Stack

The stack splits across three runtime concerns: web application (Next.js + Hono), game engine (Node.js + isolated-vm), and real-time delivery (ws + Redis pub/sub). TypeScript is used everywhere -- it is the agent language, the platform language, and the spec language. See [STACK.md](./STACK.md) for full rationale and alternatives considered.

**Core technologies:**
- **Node.js 22 LTS + TypeScript 5.7+**: Unified runtime across platform and agent sandbox
- **Next.js 15 (App Router)**: Frontend with SSR for SEO-sensitive pages (leaderboards, specs, landing)
- **Hono 4.x**: Lightweight REST API server, separated from Next.js to avoid function timeout limits
- **PostgreSQL 16 + Drizzle ORM**: Relational data with JSONB for game state, SQL-close ORM with zero codegen
- **Redis 7 + BullMQ 5.x**: Match queue, pub/sub for spectator broadcasts, session/leaderboard cache
- **isolated-vm 5.x**: V8 isolate-level sandboxing for agent code (battle-tested by Screeps MMO)
- **PixiJS 8.x**: Hardware-accelerated 2D game rendering (WebGL2), TypeScript-native, 200K+ sprites at 60fps
- **ws 8.x**: Raw WebSocket server for spectator connections (no Socket.IO overhead)
- **Better Auth 1.x**: TypeScript-first auth with plugin architecture, database sessions
- **Vitest + Playwright**: Testing stack (unit/integration + E2E)

**Deployment:** Vercel for frontend, Railway/Fly.io for backend services (game engine needs long-running processes), Neon/Supabase for managed PostgreSQL, Upstash for managed Redis.

**Monorepo structure:** Turborepo with packages for web, api, engine, ws-server, shared types, and db schema.

### Expected Features

Based on analysis of 10+ competitor platforms. See [FEATURES.md](./FEATURES.md) for full landscape.

**Must have (table stakes):**
- Agent upload and version management
- Machine-readable game specifications (TypeScript interfaces + JSON Schema)
- Match replay viewer with speed control (0.5x-8x)
- Leaderboard per discipline (ELO/TrueSkill)
- User accounts with GitHub OAuth
- Starter kits and agent templates per discipline
- Local development runner (npm package using same engine)
- Sandboxed execution with CPU/memory/time limits
- Match result history

**Should have (differentiators):**
- Live spectator mode via WebSocket (rare -- most platforms only have replays)
- Claude Code / AI-tool integration API (no competitor has this)
- Spectator-first visualization ("eSports broadcast" not "debug viewer")
- Challenge-based social matches (direct user-to-user challenges)
- Machine-readable specs designed for AI consumption (llms.txt equivalent)
- Multiple game disciplines on one platform

**Defer (v2+):**
- Automated ELO matchmaking (needs player base first)
- In-browser code editor (users have better tools)
- Multi-language agent support (TypeScript-only for MVP)
- Team competitions
- AI-generated commentary overlays
- Persistent game worlds

### Architecture Approach

The architecture follows a service-oriented design with clean module boundaries. The Match Engine is game-agnostic through a discipline plugin interface (`GameDiscipline`) that each game implements. Replays use event sourcing (record agent actions per turn, not state snapshots) enabled by a fully deterministic simulation engine. Live spectating uses WebSocket with state deltas. See [ARCHITECTURE.md](./ARCHITECTURE.md) for component diagrams, data flows, and scaling considerations.

**Major components:**
1. **Web Frontend (Next.js)** -- UI, game visualization via PixiJS, spectator client
2. **API Server (Hono)** -- REST endpoints, auth, rate limiting, agent management
3. **Match Engine** -- Game-agnostic simulation loop, discipline plugin system, event recording
4. **Sandbox Runner (isolated-vm)** -- Isolated agent code execution with resource limits
5. **WebSocket Server** -- Live spectator broadcasts, replay streaming
6. **Agent Storage** -- Versioned agent code persistence (filesystem initially, S3 at scale)
7. **Event Log** -- Append-only match event storage for deterministic replay reconstruction

**Key architectural decisions:**
- Discipline plugin interface enables adding games without changing the engine
- Event sourcing for replays (KB not MB per match, perfect accuracy)
- Separate agent-facing state (minimal) from spectator-facing state (enriched with visual metadata)
- Sequential agent execution within turns to eliminate scheduling variance

### Critical Pitfalls

Top 5 pitfalls that can cause rewrites or platform failure. See [PITFALLS.md](./PITFALLS.md) for all 13.

1. **Sandbox escape (CRITICAL)** -- Never run agent code in the main Node.js process. Use V8 isolates (isolated-vm) with strict resource limits. vm2 is deprecated with known CVEs. Defense in depth: wrap engine process in Docker container.
2. **Non-deterministic simulation (CRITICAL)** -- Ban `Math.random()`, `Date.now()`, and floating-point in game logic. Use seeded PRNG, pure functional state transitions `(state, actions) => newState`, and checksum verification every N turns. Retrofitting determinism requires a full rewrite.
3. **Spec not machine-readable (CRITICAL)** -- Design specs as TypeScript interfaces first, prose second. Test by giving the spec to Claude Code cold and measuring first-try agent generation success rate (target >90%). Ship runnable agent skeletons, not just documentation.
4. **Unfair compute allocation (CRITICAL)** -- Measure CPU time not wall-clock time. Warm up V8 JIT before matches. Execute agents sequentially within turns. Log resource usage per agent per turn for auditability.
5. **Spectator as afterthought (CRITICAL)** -- Design game state format to serve both agents AND spectators from the start. Include animation hints, event types, score deltas in spectator state. Build viewer in parallel with first discipline.

## Implications for Roadmap

Based on dependency analysis across all four research files, the following phase structure is recommended. The ordering reflects hard dependency chains: sandbox must work before games can run, games must run before spectating works, spectating must work before competition features matter.

### Phase 1: Foundation and Infrastructure
**Rationale:** Every other phase depends on database schema, auth, agent upload pipeline, and -- most critically -- a proven sandbox execution model. Sandbox security (Pitfall 1) and engine determinism (Pitfall 2) are foundational decisions that cannot be retrofitted.
**Delivers:** User accounts (GitHub OAuth), database schema, API skeleton, agent upload with validation pipeline, isolated-vm sandbox proof-of-concept with resource limits verified, project monorepo structure.
**Addresses:** User accounts, agent upload, sandboxed execution (table stakes)
**Avoids:** Pitfall 1 (sandbox escape), Pitfall 7 (no validation pipeline)

### Phase 2: First Discipline (Snake) + Game Engine
**Rationale:** Snake is the simplest discipline (single agent vs environment, no PvP matchmaking needed). Building it validates the discipline plugin interface, the deterministic engine, the event sourcing replay system, and the spectator state format -- all before tackling the harder PvP territory game.
**Delivers:** Discipline plugin interface, Snake discipline implementation, deterministic Match Engine, event log (replay recording), basic PixiJS canvas renderer, replay viewer with speed control, starter kit for Snake.
**Addresses:** Game engine, replay system, game specs, starter kits (table stakes); spectator visualization (differentiator)
**Avoids:** Pitfall 2 (non-determinism), Pitfall 5 (spectator afterthought), Pitfall 6 (monolithic engine)

### Phase 3: Live Spectating + Competition Infrastructure
**Rationale:** With Snake working end-to-end including replay, add the real-time spectating layer (WebSocket + state deltas) and the competition infrastructure needed for PvP. This phase builds the challenge system, leaderboards, and house bots to address the cold start problem before adding the second discipline.
**Delivers:** WebSocket spectator server, live match streaming with state deltas, challenge system (send/accept), ELO leaderboard per discipline, agent versioning UI, match history, house bots at multiple skill levels.
**Addresses:** Live spectator mode (differentiator), leaderboard, challenge system, agent versioning, match history (table stakes)
**Avoids:** Pitfall 4 (compute imbalance -- validated here), Pitfall 8 (cold start), Pitfall 9 (spectator latency), Pitfall 10 (no versioning)

### Phase 4: Second Discipline (Territory War) + PvP
**Rationale:** Territory War is agent-vs-agent, validating the engine's PvP capabilities and the discipline plugin system's extensibility. If adding Territory War requires changes to the Match Engine core (not just a new plugin), the architecture has a coupling problem (Pitfall 6 detection).
**Delivers:** Territory War discipline plugin, PvP match execution, Territory War starter kit, updated leaderboard for new discipline.
**Addresses:** Multiple disciplines (differentiator), agent-vs-agent competition
**Avoids:** Pitfall 6 (monolithic engine -- validated by second discipline), Pitfall 3 (spec complexity -- second spec tests the pattern), Pitfall 13 (leaderboard gaming -- ELO weighting)

### Phase 5: Programmatic API + Claude Code Integration
**Rationale:** The API wraps functionality that must already exist (upload, match, spectate, specs). Building it last ensures the underlying features are stable. This is the key differentiator but depends on everything else working first.
**Delivers:** REST API for external tools, CLI tool for local development, machine-readable discipline specs (JSON Schema + TypeScript types + llms.txt), Claude Code integration documentation, agent performance analytics.
**Addresses:** Claude Code integration (differentiator), local dev runner (table stakes), programmatic API
**Avoids:** Pitfall 3 (spec not machine-readable -- final validation with Claude Code cold test)

### Phase Ordering Rationale

- **Sandbox before games:** Agent execution isolation is the highest-security decision and shapes the entire engine architecture. Getting it wrong means a rewrite.
- **Snake before Territory War:** Single-agent-vs-environment is structurally simpler than PvP. It validates the engine, replay, and spectator systems without the complexity of two-agent fairness.
- **Spectating parallel with first game:** The spectator state format must be co-designed with the game state. Building spectating after the game state is locked produces a poor experience (Pitfall 5).
- **Competition infra before second discipline:** Leaderboards, challenges, and house bots are needed to make the platform usable. Without them, adding a second game has no competitive context.
- **Programmatic API last:** It is a thin layer over existing features. Building it first would mean building to an unstable interface.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Sandbox):** isolated-vm resource limiting details, Docker container security profiles, CPU time measurement in V8 isolates. The exact isolated-vm API for memory/CPU limits needs hands-on validation.
- **Phase 2 (Game Engine):** Deterministic PRNG implementation in TypeScript, fixed-point arithmetic library selection, checksum verification strategy. Seeded PRNG is well-documented but the specific implementation matters.
- **Phase 3 (Live Spectating):** WebSocket scaling patterns with Redis pub/sub fan-out, state delta compression for grid games. Standard patterns exist but need adaptation to this domain.

Phases with standard patterns (skip deep research):
- **Phase 1 (Auth + DB):** GitHub OAuth, PostgreSQL schema, Drizzle ORM setup -- well-documented, established patterns.
- **Phase 4 (Territory War):** If the discipline plugin interface is solid from Phase 2, adding a new game is implementation not architecture.
- **Phase 5 (API):** REST API design over existing features is standard web development.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Well-researched with explicit alternatives-considered for every choice. 15+ sources cited. Minor divergence: ARCHITECTURE.md suggests QuickJS WASM as primary sandbox while STACK.md recommends isolated-vm. Recommendation: go with isolated-vm (battle-tested by Screeps, higher confidence). |
| Features | HIGH | Based on analysis of 10+ existing platforms. Clear table stakes vs differentiators. MVP recommendations are well-scoped. |
| Architecture | HIGH | Discipline plugin pattern, event sourcing for replays, and WebSocket state deltas are all well-established patterns with strong precedent (Halite, Battlecode, Factorio). |
| Pitfalls | HIGH | 13 pitfalls documented with prevention, detection, and phase mapping. Critical pitfalls (sandbox, determinism, spec design) are backed by CVE databases, game dev post-mortems, and platform failure analysis. |

**Overall confidence:** HIGH

### Gaps to Address

- **Sandbox choice divergence:** STACK.md recommends isolated-vm, ARCHITECTURE.md recommends QuickJS WASM. Both reject vm2. Recommendation: start with isolated-vm (proven at scale by Screeps, stronger ecosystem). Validate with a proof-of-concept in Phase 1. If isolated-vm resource limiting proves insufficient, QuickJS WASM is the fallback.
- **Canvas vs PixiJS:** ARCHITECTURE.md suggests plain Canvas 2D is sufficient; STACK.md recommends PixiJS for hardware acceleration. Recommendation: use PixiJS. The spectator-first vision demands smooth animations and visual polish that raw Canvas makes harder. PixiJS is not much more complex to set up.
- **API framework divergence:** ARCHITECTURE.md suggests tRPC or Next.js API Routes; STACK.md recommends separate Hono server. Recommendation: Hono. Match execution and WebSocket connections need long-running processes that cannot run in Vercel Functions. Separating the API from Next.js is the right call.
- **Auth library:** STACK.md recommends Better Auth; ARCHITECTURE.md mentions NextAuth/Auth.js. Recommendation: Better Auth (TypeScript-first, database sessions, not JWT-default). Needs validation during Phase 1 as it is newer.
- **ELO/TrueSkill algorithm selection:** Not deeply researched. Standard ELO is sufficient for MVP. TrueSkill is better for small match counts but adds complexity. Decide during Phase 3 planning.
- **Agent code bundling pipeline:** How to compile user TypeScript to sandboxed JS needs practical validation. The upload flow (TS -> type-check -> bundle -> store) is outlined but specific tooling (esbuild? tsup? tsc?) needs testing.

## Sources

### Primary (HIGH confidence)
- [Screeps architecture](https://docs.screeps.com/architecture.html) -- isolated-vm in production at scale
- [Halite AI Competition](https://en.wikipedia.org/wiki/Halite_AI_Programming_Competition) -- replay system, spec design, fairness
- [Battlecode](https://battlecode.org/) -- deterministic simulation, starter kits, community building
- [CVE-2026-22709 vm2](https://www.endorlabs.com/learn/cve-2026-22709) -- sandbox escape confirmation
- [Event Sourcing - Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html) -- replay pattern
- [Factorio Desync Documentation](https://wiki.factorio.com/Desynchronization) -- determinism pitfalls
- [PixiJS v8](https://pixijs.com/blog/pixi-v8-launches) -- rendering performance
- [Drizzle ORM](https://orm.drizzle.team/) -- ORM choice
- [BullMQ](https://docs.bullmq.io) -- job queue

### Secondary (MEDIUM confidence)
- [Better Auth vs Lucia 2026](https://trybuildpilot.com/625-better-auth-vs-lucia-vs-nextauth-2026) -- auth library comparison
- [sebastianwessel/quickjs](https://github.com/sebastianwessel/quickjs) -- QuickJS WASM alternative sandbox
- [Addy Osmani: Specs for AI Agents](https://addyosmani.com/blog/good-spec/) -- machine-readable spec design
- [NVIDIA Sandbox Security Guidance](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows/) -- sandbox best practices
- [Hono vs Fastify](https://betterstack.com/community/guides/scaling-nodejs/hono-vs-fastify/) -- framework comparison

### Tertiary (LOW confidence)
- [microsandbox](https://github.com/zerocore-ai/microsandbox) -- future scaling option, needs validation
- [MoltGamingLab](https://moltgaminglab.com/) -- LLM agent competition reference, small platform

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
