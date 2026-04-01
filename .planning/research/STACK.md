# Technology Stack

**Project:** AI Agent Arena
**Researched:** 2026-04-01

## Recommended Stack

This platform has three distinct runtime concerns that drive the architecture:
1. **Web application** (UI, API, auth, data) -- standard web stack
2. **Game engine** (match execution, sandboxed agents, state management) -- specialized game server
3. **Real-time delivery** (spectating, replays) -- WebSocket layer

These concerns should be separate services sharing a database, not a monolith.

### Core Framework & Runtime

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Node.js | 22 LTS | Server runtime | TypeScript-native, same runtime as agent sandbox (isolated-vm), mature WebSocket support | HIGH |
| Hono | 4.x | REST API framework | TypeScript-first, lightweight, faster than Express, excellent middleware system. Fastify is heavier than needed here -- Hono's simplicity fits a focused API layer | MEDIUM |
| Next.js | 15.x | Frontend application | App Router for SSR/SSG pages (leaderboards, specs, landing), React Server Components for data-heavy pages. NOT used as API backend -- separate Hono service handles that | HIGH |
| TypeScript | 5.7+ | Language | Non-negotiable -- agents are TypeScript, platform is TypeScript, type safety across the entire stack | HIGH |

**Why NOT Colyseus for the game server:** Colyseus is designed for real-time multiplayer where human players interact with live game state. AI Agent Arena runs turn-based simulations server-side where agents execute in sandboxes. Colyseus's room/matchmaking/client-sync model adds complexity without benefit. A custom game engine loop is simpler and gives full control over execution timing, sandbox lifecycle, and replay recording.

**Why NOT NestJS:** Over-engineered for this use case. Angular-style decorators and DI add ceremony without proportional benefit for a focused game platform. Hono is leaner and faster.

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16+ | Primary database | Relational data (users, agents, matches, leaderboards), JSONB for game state snapshots, proven at scale | HIGH |
| Drizzle ORM | 0.38+ | Database access | TypeScript-native schema definitions (no Prisma schema language), SQL-like query builder, zero code generation step, fast startup for serverless-compatible deployment | HIGH |
| Redis | 7.x | Cache, pub/sub, queues | Match queue (BullMQ), real-time pub/sub for spectator broadcasts, session cache, leaderboard caching | HIGH |

**Why NOT Prisma:** Prisma requires a binary engine and code generation step. Drizzle is pure TypeScript with SQL-level control and instant startup. For a game platform that needs precise queries (leaderboard rankings, match history aggregations), Drizzle's SQL-closeness is an advantage.

**Why NOT MongoDB:** Game data is inherently relational (users have agents, agents play in matches, matches have results, results feed leaderboards). PostgreSQL's JSONB handles semi-structured game state snapshots without sacrificing relational integrity.

### Sandboxed Agent Execution

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| isolated-vm | 5.x | Agent code sandbox | V8 isolate-level isolation (separate heap, GC, event loop per agent). Battle-tested by Screeps (MMO running thousands of player scripts). In-process = low latency for turn-by-turn execution | HIGH |
| Docker containers | - | Secondary isolation layer | Wrap the game engine process in a container for OS-level isolation. Defense in depth -- isolated-vm handles per-agent isolation, Docker handles process-level security | MEDIUM |

**Why NOT vm2:** Deprecated, critical sandbox escape CVEs published as recently as January 2026. Do not use.

**Why NOT cloud sandboxes (E2B, Riza, Vercel Sandbox):** These add 100-200ms network latency per execution call. Agent turns need sub-millisecond execution for a Snake game running hundreds of ticks. Cloud sandboxes are designed for one-shot code execution, not tight game loops with thousands of rapid calls. isolated-vm runs in-process with microsecond overhead.

**Why NOT Cloudflare Workers / Deno Deploy:** Same latency problem, plus cold start issues. Agent execution must be deterministic and fast within a controlled game loop.

### Real-Time & WebSocket Layer

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ws | 8.x | WebSocket server | Fastest Node.js WebSocket implementation. No Socket.IO overhead (fallback transports, auto-reconnection) -- spectators use modern browsers that all support native WebSocket | HIGH |
| BullMQ | 5.x | Job queue | Match execution queue (schedule, prioritize, retry failed matches). Redis-backed, TypeScript-native, battle-tested at scale | HIGH |

**Why NOT Socket.IO:** Socket.IO adds ~40KB client bundle, polling fallbacks, and abstraction overhead. For a game spectating use case where every client supports WebSocket, raw `ws` is simpler and faster. Socket.IO's "rooms" feature is nice but trivially reimplemented with a Map.

### Frontend & Game Visualization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 19.x | UI framework | Via Next.js, component ecosystem, hooks for game state management | HIGH |
| PixiJS | 8.x | Game rendering | Hardware-accelerated 2D rendering (WebGL2/WebGPU), handles 200K+ sprites at 60fps. Purpose-built for 2D game visualization. v8 rewrote in TypeScript with 3x performance gains | HIGH |
| Tailwind CSS | 4.x | UI styling | Utility-first, fast iteration, great with React | HIGH |
| shadcn/ui | latest | UI components | Copy-paste components (not dependency), Tailwind-based, customizable. Leaderboards, forms, modals, navigation | HIGH |

**Why NOT Phaser:** Phaser is a full game framework (physics, input, scenes, audio). We only need a rendering engine -- game logic runs server-side. PixiJS is the rendering layer Phaser is built on, without the game framework overhead. Using Phaser would mean fighting its game loop model since our "game" is actually a replay/spectator visualizer driven by server state.

**Why NOT Canvas 2D API directly:** Too low-level. PixiJS provides sprite batching, texture management, and WebGL acceleration. Rolling our own renderer would be weeks of work for worse performance.

**Why NOT Three.js:** 3D renderer. Grid-based games are 2D. Massive overkill.

### Authentication & Authorization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Better Auth | 1.x | Authentication | Modern TypeScript-first auth library with plugin architecture (2FA, API keys, OAuth). Database sessions by default (more secure than JWT). Lucia Auth is in maintenance mode as of 2025 -- Better Auth is the successor | MEDIUM |

**Why NOT Auth.js (NextAuth):** JWT-based by default (less secure for a platform handling code uploads), complex adapter pattern, historically unstable API between versions. Better Auth's plugin model is cleaner.

**Why NOT Clerk/Auth0:** Third-party dependency for a core feature. API key management for Claude Code integration needs custom logic that hosted auth services make harder. Self-hosted auth gives full control over the programmatic API authentication flow.

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| Zod | 3.x | Schema validation | API input validation, agent spec validation, config parsing | HIGH |
| nanoid | 5.x | ID generation | Match IDs, agent IDs -- URL-safe, short, fast | HIGH |
| pino | 9.x | Logging | Structured JSON logging, fast (10x faster than Winston) | HIGH |
| date-fns | 4.x | Date handling | Match timestamps, leaderboard periods | HIGH |
| tsx | 4.x | Dev runner | Run TypeScript directly in development without build step | HIGH |
| tsup | 8.x | Build tool | Bundle game engine and API server for production | HIGH |
| Vitest | 3.x | Testing | Unit + integration tests, fast, TypeScript-native, compatible with Jest API | HIGH |
| Playwright | 1.x | E2E testing | Browser testing for spectator UI, match visualization | HIGH |
| Docker Compose | 3.x | Local dev environment | PostgreSQL + Redis + services in one command | HIGH |

### Infrastructure & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | - | Frontend hosting | Next.js deployment, edge network, preview deployments | HIGH |
| Railway / Fly.io | - | Backend hosting | Long-running Node.js processes (game engine, WebSocket server, workers). Vercel Functions timeout too quickly for match execution | MEDIUM |
| Neon / Supabase | - | Managed PostgreSQL | Serverless-compatible, branching for dev/staging, connection pooling | MEDIUM |
| Upstash | - | Managed Redis | Serverless Redis for BullMQ and pub/sub, pay-per-request pricing for early stage | MEDIUM |

**Why NOT all-Vercel:** Vercel Functions have a 60s timeout (300s on Pro). Match execution can take minutes. WebSocket connections need persistent servers. The game engine needs a traditional long-running process, not serverless functions.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| API framework | Hono | Fastify | Heavier, more ceremony, Hono's simplicity fits better |
| API framework | Hono | Express | Slow, no TypeScript-first design, callback-heavy |
| ORM | Drizzle | Prisma | Binary engine, code gen step, less SQL control |
| ORM | Drizzle | Kysely | Drizzle has better schema definition and migration tooling |
| Sandbox | isolated-vm | vm2 | Deprecated, critical CVEs, sandbox escapes |
| Sandbox | isolated-vm | E2B/Riza | Network latency kills tight game loops |
| Game viz | PixiJS | Phaser | Full framework overhead when we only need rendering |
| Game viz | PixiJS | Canvas 2D | Too low-level, no GPU acceleration |
| WebSocket | ws | Socket.IO | Unnecessary abstractions, larger bundle |
| Auth | Better Auth | Lucia Auth | Maintenance mode, no new features |
| Auth | Better Auth | NextAuth/Auth.js | JWT default, unstable API, complex adapters |
| Game server | Custom engine | Colyseus | Wrong model (real-time sync vs turn-based simulation) |
| Frontend | Next.js | Remix | Smaller ecosystem, less SSR optimization |
| Queue | BullMQ | Agenda | Less maintained, Mongo-based, not Redis |

## Architecture: Service Boundaries

```
[Next.js Frontend]  <-->  [Hono API Server]  <-->  [PostgreSQL]
        |                       |                       ^
        |                  [BullMQ]                     |
        |                       |                       |
        +--- WebSocket ---[Game Engine Service]         |
                                |                       |
                          [isolated-vm]                 |
                          [Match Runner]  ------------>-+
                                |
                          [Redis Pub/Sub] ---> [WebSocket broadcast to spectators]
```

- **Next.js Frontend**: UI, pages, client-side game visualization (PixiJS)
- **Hono API Server**: REST API for agents, matches, leaderboards, auth
- **Game Engine Service**: Pulls matches from BullMQ, executes in isolated-vm, publishes state to Redis pub/sub, writes results to PostgreSQL
- **WebSocket Server**: Subscribes to Redis pub/sub, broadcasts game state to spectating clients

## Installation

```bash
# Core backend
npm install hono @hono/node-server drizzle-orm postgres zod bullmq ioredis ws nanoid pino better-auth

# Frontend
npm install next react react-dom pixi.js tailwindcss @tailwindcss/vite

# Sandbox
npm install isolated-vm

# Dev dependencies
npm install -D typescript tsx tsup vitest @playwright/test drizzle-kit @types/ws @types/node prettier
```

## Monorepo Structure (Recommended)

```
ai-agent-arena/
  packages/
    web/          # Next.js frontend
    api/          # Hono API server
    engine/       # Game engine + match runner
    ws-server/    # WebSocket spectator server
    shared/       # Shared types, game specs, validation schemas
    db/           # Drizzle schema, migrations
  docker-compose.yml
  turbo.json      # Turborepo for monorepo orchestration
```

Use **Turborepo** for monorepo management (caching, task orchestration, dependency graph).

## Sources

- [Riza: isolated-vm alternatives](https://riza.io/compare/isolated-vm-alternative) -- sandbox comparison
- [Better Stack: Sandbox runners 2026](https://betterstack.com/community/comparisons/best-sandbox-runners/) -- sandbox landscape
- [Screeps architecture](https://docs.screeps.com/architecture.html) -- isolated-vm production usage
- [Screeps isolated-vm deep dive](https://sudonull.com/post/1492-Under-the-hood-of-Screeps-virtualization-in-the-MMO-sandbox-for-programmers) -- lessons learned
- [isolated-vm GitHub](https://github.com/laverdet/isolated-vm) -- library documentation
- [vm2 CVE-2026-22709](https://www.endorlabs.com/learn/cve-2026-22709-critical-sandbox-escape-in-vm2-enables-arbitrary-code-execution) -- why NOT vm2
- [Colyseus docs](https://docs.colyseus.io/) -- evaluated and rejected for this use case
- [PixiJS v8 launch](https://pixijs.com/blog/pixi-v8-launches) -- rendering performance
- [PixiJS performance tips](https://pixijs.com/8.x/guides/concepts/performance-tips) -- optimization guidance
- [Hono vs Fastify](https://betterstack.com/community/guides/scaling-nodejs/hono-vs-fastify/) -- framework comparison
- [Drizzle ORM docs](https://orm.drizzle.team/) -- ORM choice rationale
- [BullMQ docs](https://docs.bullmq.io) -- job queue for match processing
- [Better Auth vs Lucia 2026](https://trybuildpilot.com/625-better-auth-vs-lucia-vs-nextauth-2026) -- auth library comparison
- [Lucia maintenance mode](https://lucia-auth.com/) -- deprecation status
- [Next.js backend patterns](https://nextjs.org/docs/app/guides/backend-for-frontend) -- when to separate backend
