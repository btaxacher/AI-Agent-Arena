# Phase 2: Snake Discipline and Spectating - Research

**Researched:** 2026-04-02
**Domain:** Game Engine (Snake), Machine-Readable Specs, PixiJS Rendering, WebSocket Live Spectating, Replay System
**Confidence:** HIGH

## Summary

Phase 2 builds the first complete game loop: a Snake discipline with a deterministic game engine, machine-readable specifications (TypeScript interfaces + JSON Schema), a PixiJS-based spectator renderer, live WebSocket spectating, and a replay system. This phase transforms the platform from "agent upload infrastructure" into "playable game arena."

The architecture splits into four concerns: (1) a server-side Snake game engine running in the Hono API process, using the existing isolated-vm sandbox to execute agent `move()` calls each tick, recording every frame to a match history stored in PostgreSQL; (2) a WebSocket layer using `@hono/node-ws` for live spectating with Redis pub/sub for broadcasting state; (3) a client-side PixiJS 8 renderer in Next.js that visualizes game state received via WebSocket (live) or fetched as a complete replay; (4) Zod schemas that serve as both runtime validation and the source of truth for machine-readable specs (TypeScript types inferred via `z.infer`, JSON Schema generated via `z.toJSONSchema()` in Zod 4 or `zod-to-json-schema` for Zod 3).

The biggest technical risks are deterministic game execution (requires seeded PRNG, no floating-point arithmetic in game logic), WebSocket integration with the existing Hono server, and PixiJS SSR compatibility with Next.js (requires dynamic import with `ssr: false`).

**Primary recommendation:** Build in this order: (1) Snake game specification (Zod schemas, TypeScript types, JSON Schema export), (2) deterministic Snake game engine with tick-based loop and match recording, (3) database schema for matches and match frames, (4) WebSocket server integration and live spectating, (5) PixiJS spectator renderer with replay playback and decision overlay.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GAME-01 | Snake discipline -- agent controls snake, collects points, survives | Snake game engine with tick-based loop, deterministic PRNG (prando), grid-based movement, collision detection, food spawning |
| GAME-03 | Machine-readable specs (TypeScript interfaces + JSON Schema) per discipline | Zod schemas as single source of truth, `z.infer<>` for TypeScript types, zod-to-json-schema for JSON Schema export, starter agent template |
| SPEC-01 | User can watch running matches live via WebSocket | @hono/node-ws for WebSocket upgrade on existing Hono server, Redis pub/sub for match state broadcasting |
| SPEC-02 | User can watch completed matches as replay | Match frames stored in PostgreSQL JSONB, replay endpoint serves complete frame array, client-side playback with frame stepping |
| SPEC-03 | Decision overlay shows high-level agent decisions during spectating | Agent `move()` return value includes optional `reasoning` field, overlay rendered as PixiJS text/panel on game canvas |
</phase_requirements>

## Standard Stack

### Core (Phase 2 Specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pixi.js | 8.17.x | Game rendering (spectator) | Hardware-accelerated 2D, WebGL2/WebGPU, TypeScript-native in v8, project decision from STACK.md |
| @hono/node-ws | 1.3.x | WebSocket server | Official Hono WebSocket adapter for Node.js, integrates with existing @hono/node-server |
| prando | 6.x | Deterministic PRNG | Seedable, reproducible sequences, TypeScript-native, reset capability for replays |
| ioredis | 5.x | Redis client | Required by BullMQ, also used for pub/sub match broadcasting |
| bullmq | 5.x | Match execution queue | Redis-backed job queue for scheduling and processing match execution |
| zod-to-json-schema | 3.x | JSON Schema from Zod | Converts Zod schemas to JSON Schema for machine-readable specs (use until Zod v4 ships native support) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Redis | 7.x | Pub/sub, queue backend | Match state broadcasting to spectators, BullMQ backend |
| next/dynamic | (built-in) | Dynamic imports | Load PixiJS components with `ssr: false` to avoid SSR window errors |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| prando | seedrandom | seedrandom is older, less TypeScript-friendly. prando has built-in reset and TypeScript types |
| @hono/node-ws | ws directly | ws is lower-level; @hono/node-ws integrates with Hono middleware and routing |
| Redis pub/sub | In-process EventEmitter | EventEmitter works for single-process but blocks horizontal scaling. Redis pub/sub is production-ready |
| zod-to-json-schema | Zod v4 native | Zod v4 has `z.toJSONSchema()` built-in but project uses Zod 3.24.x. Use bridge library until upgrade |
| BullMQ | simple setInterval | BullMQ adds retry, concurrency, priority. Worth the Redis dependency since Redis is already needed for pub/sub |

**Installation:**
```bash
# packages/engine (game engine additions)
npm install prando

# packages/api (WebSocket + queue)
npm install @hono/node-ws bullmq ioredis zod-to-json-schema

# apps/web (rendering)
npm install pixi.js

# Infrastructure
# Add Redis to docker-compose.yml
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
packages/
  engine/
    src/
      disciplines/
        snake/
          engine.ts          # Snake game loop (tick-based, deterministic)
          rules.ts           # Snake rules (grid size, speed, scoring)
          types.ts           # Snake-specific types (direction, cell, etc.)
        types.ts             # Shared discipline types (GameEngine interface)
      sandbox.ts             # (existing) isolated-vm wrapper
      compiler.ts            # (existing) esbuild compiler
  api/
    src/
      routes/
        matches.ts           # Match CRUD + start match endpoint
        spectate.ts          # WebSocket spectating route
      services/
        match-runner.ts      # Orchestrates match: engine + sandbox + recording
        match-broadcaster.ts # Redis pub/sub for live spectating
  shared/
    src/
      types/
        snake.ts             # Snake game state, move input/output types
        match.ts             # Match metadata, frame data types
      specs/
        snake.schema.ts      # Zod schemas (source of truth)
        snake.json           # Generated JSON Schema (committed artifact)
  db/
    src/
      schema/
        matches.ts           # Matches table
        match-frames.ts      # Match frames table (JSONB game state per tick)
apps/
  web/
    src/
      components/
        game/
          snake-renderer.tsx    # PixiJS Snake canvas (client-only)
          game-canvas.tsx       # Dynamic import wrapper (ssr: false)
          decision-overlay.tsx  # Agent decision display
          replay-controls.tsx   # Play/pause/scrub for replays
      app/
        matches/
          [id]/
            page.tsx           # Match spectator/replay page
          page.tsx             # Match listing page
```

### Pattern 1: Deterministic Snake Game Engine

**What:** A tick-based game engine that produces identical results given the same seed and agent decisions.
**When to use:** All match execution (GAME-01).

```typescript
// packages/engine/src/disciplines/snake/engine.ts
import Prando from "prando"

interface SnakeGameConfig {
  gridWidth: number       // e.g., 20
  gridHeight: number      // e.g., 20
  maxTicks: number        // e.g., 500
  initialLength: number   // e.g., 3
  seed: string            // deterministic PRNG seed
}

interface SnakeGameState {
  tick: number
  snake: Array<{ x: number; y: number }>
  food: { x: number; y: number }
  direction: "up" | "down" | "left" | "right"
  score: number
  alive: boolean
  gridWidth: number
  gridHeight: number
}

interface SnakeFrame {
  tick: number
  state: SnakeGameState
  agentMove: string | null          // what the agent returned
  agentReasoning: string | null     // optional reasoning for overlay
  cpuTimeNs: bigint
}

// Engine uses integer math ONLY -- no floating point
// PRNG is seeded -- identical seed + moves = identical game
function createSnakeEngine(config: SnakeGameConfig) {
  const rng = new Prando(config.seed)
  // ... spawn food using rng.nextInt(0, gridWidth - 1)
  // ... each tick: get agent move, validate, update state, check collisions
  // ... record frame to history
}
```

### Pattern 2: Match Runner (Engine + Sandbox Orchestration)

**What:** Coordinates game engine ticks with agent sandbox execution and frame recording.
**When to use:** Every match execution.

```typescript
// packages/api/src/services/match-runner.ts
import { executeInSandbox } from "@repo/engine"
import { createSnakeEngine } from "@repo/engine/disciplines/snake"

interface MatchResult {
  matchId: string
  frames: SnakeFrame[]
  finalScore: number
  ticksPlayed: number
  terminationReason: "completed" | "timeout" | "crash" | "death"
}

async function runMatch(
  agentCompiledCode: string,
  config: SnakeGameConfig
): Promise<MatchResult> {
  const engine = createSnakeEngine(config)
  const frames: SnakeFrame[] = []

  while (engine.isAlive() && engine.tick < config.maxTicks) {
    const state = engine.getState()

    // Execute agent in sandbox -- get move decision
    const sandboxResult = await executeInSandbox(
      agentCompiledCode,
      state,
      { memoryLimitMb: 64, timeoutMs: 100 }
    )

    // Record frame BEFORE applying move
    const frame = engine.applyMove(sandboxResult.result)
    frames.push({
      ...frame,
      cpuTimeNs: sandboxResult.cpuTimeNs,
    })
  }

  return {
    matchId: nanoid(),
    frames,
    finalScore: engine.getScore(),
    ticksPlayed: engine.tick,
    terminationReason: engine.getTerminationReason(),
  }
}
```

### Pattern 3: WebSocket Spectating with @hono/node-ws

**What:** Live match state broadcasting via WebSocket.
**When to use:** SPEC-01 (live spectating).

```typescript
// packages/api/src/routes/spectate.ts
import { Hono } from "hono"
import { createNodeWebSocket } from "@hono/node-ws"

// In main server setup:
// const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })
// ... after serve(): injectWebSocket(server)

export function createSpectateRoutes(
  upgradeWebSocket: ReturnType<typeof createNodeWebSocket>["upgradeWebSocket"]
) {
  const routes = new Hono()

  routes.get(
    "/matches/:matchId/spectate",
    upgradeWebSocket((c) => {
      const matchId = c.req.param("matchId")
      return {
        onOpen(_event, ws) {
          // Subscribe this WebSocket to match's Redis pub/sub channel
          subscribeToMatch(matchId, (frame) => {
            ws.send(JSON.stringify(frame))
          })
        },
        onClose() {
          // Unsubscribe from Redis channel
          unsubscribeFromMatch(matchId)
        },
      }
    })
  )

  return routes
}
```

### Pattern 4: PixiJS Renderer in Next.js (Client-Only)

**What:** PixiJS canvas component loaded with dynamic import to avoid SSR issues.
**When to use:** All game rendering (spectator view, replay).

```typescript
// apps/web/src/components/game/game-canvas.tsx
"use client"
import dynamic from "next/dynamic"

const SnakeRenderer = dynamic(
  () => import("./snake-renderer"),
  { ssr: false }
)

interface GameCanvasProps {
  frames: SnakeFrame[]
  mode: "live" | "replay"
}

export function GameCanvas({ frames, mode }: GameCanvasProps) {
  return <SnakeRenderer frames={frames} mode={mode} />
}
```

```typescript
// apps/web/src/components/game/snake-renderer.tsx
"use client"
import { Application, Graphics } from "pixi.js"
import { useEffect, useRef } from "react"

// PixiJS 8 requires async init
export default function SnakeRenderer({ frames, mode }: GameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const app = new Application()

    async function init() {
      await app.init({
        width: 600,
        height: 600,
        backgroundColor: 0x1a1a2e,
      })
      canvasRef.current?.appendChild(app.canvas)

      // Create grid graphics, snake sprites, food sprite
      // Subscribe to frame updates (live) or step through frames (replay)
    }

    init()
    return () => { app.destroy(true) }
  }, [])

  return <div ref={canvasRef} />
}
```

### Pattern 5: Machine-Readable Spec (Zod as Source of Truth)

**What:** Zod schemas define the game spec; TypeScript types and JSON Schema are derived.
**When to use:** GAME-03 (machine-readable specs).

```typescript
// packages/shared/src/specs/snake.schema.ts
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

// The game state an agent receives each tick
export const snakeGameStateSchema = z.object({
  tick: z.number().int().nonnegative(),
  snake: z.array(z.object({ x: z.number().int(), y: z.number().int() })),
  food: z.object({ x: z.number().int(), y: z.number().int() }),
  direction: z.enum(["up", "down", "left", "right"]),
  score: z.number().int().nonnegative(),
  alive: z.boolean(),
  gridWidth: z.number().int().positive(),
  gridHeight: z.number().int().positive(),
})

// What the agent must return
export const snakeMoveSchema = z.object({
  direction: z.enum(["up", "down", "left", "right"]),
  reasoning: z.string().max(200).optional(), // for decision overlay (SPEC-03)
})

// Derived TypeScript types
export type SnakeGameState = z.infer<typeof snakeGameStateSchema>
export type SnakeMove = z.infer<typeof snakeMoveSchema>

// Generated JSON Schema (for Claude Code / external tools)
export const snakeGameStateJsonSchema = zodToJsonSchema(snakeGameStateSchema, "SnakeGameState")
export const snakeMoveJsonSchema = zodToJsonSchema(snakeMoveSchema, "SnakeMove")
```

### Pattern 6: Replay Storage and Playback

**What:** Store complete match frame history in PostgreSQL, serve as replay.
**When to use:** SPEC-02 (replay).

```typescript
// packages/db/src/schema/matches.ts
import { pgTable, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core"
import { nanoid } from "nanoid"

export const matches = pgTable("matches", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  agentId: text("agent_id").notNull(),
  userId: text("user_id").notNull(),
  discipline: text("discipline").notNull(), // "snake"
  seed: text("seed").notNull(),
  config: jsonb("config").notNull(),        // SnakeGameConfig
  status: text("status").notNull(),         // "running" | "completed" | "error"
  score: integer("score"),
  ticksPlayed: integer("ticks_played"),
  terminationReason: text("termination_reason"),
  frames: jsonb("frames"),                  // Array<SnakeFrame> -- full replay data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
})
```

**Design decision: frames stored inline vs. separate table.** For Phase 2 (single-agent Snake, ~500 ticks max), storing frames as a JSONB array in the matches table is simpler. Each frame is ~200 bytes, so a 500-tick match is ~100KB -- well within PostgreSQL JSONB limits. Split to a separate `match_frames` table if matches grow to thousands of ticks or PvP with multiple agents.

### Anti-Patterns to Avoid

- **Floating-point arithmetic in game logic:** Use integer-only math for positions, scores, and grid calculations. Floating-point produces different results across platforms, breaking replay determinism.
- **Math.random() in game engine:** Always use seeded PRNG (prando). Without deterministic randomness, replays cannot reproduce the original match.
- **PixiJS imported at module level in Next.js:** PixiJS accesses `window` and `document` on import. Always use `dynamic(() => import(...), { ssr: false })`.
- **Creating a new isolated-vm isolate per tick:** Reuse the isolate across ticks within a match. Creating/destroying isolates has significant overhead. Create once at match start, dispose at match end.
- **Blocking the API server during match execution:** Run matches in a BullMQ worker or a separate process. A 500-tick match with 100ms agent timeout could take 50 seconds.
- **WebSocket on the same route as CORS middleware:** @hono/node-ws and CORS middleware conflict on header modification. Exclude WebSocket routes from CORS middleware.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deterministic random numbers | Custom LCG/xorshift | prando | Edge cases in distribution, period length, seed handling. prando is tested and TypeScript-native |
| JSON Schema generation | Manual JSON Schema writing | zod-to-json-schema | Keeps schemas in sync with TypeScript types automatically. Manual JSON Schema drifts |
| WebSocket server | Raw `ws` + manual upgrade | @hono/node-ws | Integrates with Hono routing, middleware context, and the existing server setup |
| Game rendering | Canvas 2D API directly | PixiJS 8 | Sprite batching, texture atlas, WebGL acceleration. Custom renderer is weeks of work |
| Job queue | setInterval + in-memory queue | BullMQ | Retry logic, concurrency limits, job persistence across restarts, dead letter queues |
| Pub/sub broadcasting | In-process EventEmitter | Redis pub/sub | Scales across processes. EventEmitter dies with the process and blocks horizontal scaling |

**Key insight:** Phase 2 has real complexity in the game engine logic and spectator UX. Every infrastructure piece (WebSocket, queue, pub/sub, rendering, PRNG) should use established libraries so development time goes to game design and spectating experience.

## Common Pitfalls

### Pitfall 1: Non-Deterministic Game Execution Breaks Replays

**What goes wrong:** Replays produce different results than the original match because the game engine uses non-deterministic operations (Math.random, Date.now, floating-point).
**Why it happens:** JavaScript's Math.random is not seedable. Floating-point operations can differ across V8 versions.
**How to avoid:** (1) Use prando with a stored seed for ALL randomness. (2) Use integer-only arithmetic for positions and scores. (3) Store the seed in the match record. (4) Write a test that runs the same seed twice and asserts identical frame sequences.
**Warning signs:** Replay renders a different game than what was played live.

### Pitfall 2: PixiJS "window is not defined" in Next.js SSR

**What goes wrong:** Next.js server-side rendering crashes because PixiJS accesses browser globals on import.
**Why it happens:** PixiJS checks for `window`, `document`, `navigator` at module load time, not just at runtime.
**How to avoid:** Always load PixiJS components via `next/dynamic` with `{ ssr: false }`. Never import `pixi.js` in a file that could be server-rendered. Create a dedicated client-only wrapper component.
**Warning signs:** Build errors or SSR hydration mismatches mentioning `window` or `document`.

### Pitfall 3: WebSocket + CORS Middleware Header Conflict

**What goes wrong:** WebSocket upgrade fails with "Headers are immutable" error.
**Why it happens:** Hono CORS middleware modifies response headers. WebSocket upgrade also modifies headers. When both run on the same route, headers are already committed.
**How to avoid:** Exclude WebSocket routes from CORS middleware. Use a path-based middleware guard: `app.use("/api/*", cors(...))` and keep WebSocket routes under `/ws/*`.
**Warning signs:** WebSocket connections fail to upgrade, 500 errors on WebSocket handshake.

### Pitfall 4: Isolate Reuse Within Match vs. Between Matches

**What goes wrong:** Creating a new isolated-vm isolate per tick makes the match runner 100x slower than necessary.
**Why it happens:** Each `new ivm.Isolate()` call allocates a new V8 heap. For 500 ticks, that is 500 heap allocations.
**How to avoid:** Create one isolate at match start. Compile the agent script once. Each tick, only call `move(__gameState__)` with updated state. Dispose the isolate when the match ends. The existing `executeInSandbox` creates/disposes per call -- for match execution, create a `MatchSandbox` class that holds the isolate.
**Warning signs:** Match execution takes minutes instead of seconds.

### Pitfall 5: Match Execution Blocking the API Server

**What goes wrong:** Starting a match blocks the Hono API process for 10-50 seconds, making all other API calls unresponsive.
**Why it happens:** Match execution is CPU-intensive (hundreds of sandbox calls). Running it in the API request handler blocks the event loop.
**How to avoid:** Use BullMQ to queue match execution. The API endpoint creates a match record with status "queued" and returns immediately. A BullMQ worker (can run in same process but separate worker thread, or ideally a separate process) picks up the job and runs the match. Match status transitions: queued -> running -> completed/error.
**Warning signs:** API health check returns slowly or times out during match execution.

### Pitfall 6: Replay Data Growing Too Large

**What goes wrong:** Storing full game state per tick (20x20 grid, snake positions, food) in JSONB for every match consumes significant storage.
**Why it happens:** 500 frames * 200 bytes = 100KB per match. At 10,000 matches, that is 1GB just for replays.
**How to avoid:** For Phase 2 with low match volume, inline JSONB is fine. Monitor storage growth. When scaling, consider: (1) store only deltas (changed cells) instead of full state, (2) compress frames with zlib before storing, (3) move replay data to S3/object storage. Phase 2 does not need optimization yet.
**Warning signs:** PostgreSQL disk usage growing faster than expected.

## Code Examples

### Starter Agent (Generated from Spec)

```typescript
// starter-agent.ts -- generated from snake specification
// This agent moves toward food using simple Manhattan distance

interface SnakeGameState {
  tick: number
  snake: Array<{ x: number; y: number }>
  food: { x: number; y: number }
  direction: "up" | "down" | "left" | "right"
  score: number
  alive: boolean
  gridWidth: number
  gridHeight: number
}

interface SnakeMove {
  direction: "up" | "down" | "left" | "right"
  reasoning?: string
}

function move(state: SnakeGameState): SnakeMove {
  const head = state.snake[0]
  const food = state.food

  const dx = food.x - head.x
  const dy = food.y - head.y

  // Simple greedy: move toward food
  let direction: SnakeMove["direction"] = state.direction

  if (Math.abs(dx) > Math.abs(dy)) {
    direction = dx > 0 ? "right" : "left"
  } else {
    direction = dy > 0 ? "down" : "up"
  }

  return {
    direction,
    reasoning: `Moving ${direction} toward food at (${food.x}, ${food.y})`,
  }
}
```

### Redis Pub/Sub Match Broadcaster

```typescript
// packages/api/src/services/match-broadcaster.ts
import Redis from "ioredis"

const publisher = new Redis(process.env.REDIS_URL!)

export async function publishFrame(
  matchId: string,
  frame: SnakeFrame
): Promise<void> {
  await publisher.publish(
    `match:${matchId}`,
    JSON.stringify({
      type: "frame",
      data: frame,
    })
  )
}

export async function publishMatchEnd(
  matchId: string,
  result: MatchResult
): Promise<void> {
  await publisher.publish(
    `match:${matchId}`,
    JSON.stringify({
      type: "match_end",
      data: {
        score: result.finalScore,
        ticksPlayed: result.ticksPlayed,
        terminationReason: result.terminationReason,
      },
    })
  )
}
```

### Database Schema for Matches

```typescript
// packages/db/src/schema/matches.ts
import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core"
import { nanoid } from "nanoid"
import { user } from "./users.js"
import { agents } from "./agents.js"

export const matches = pgTable("matches", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id),
  agentId: text("agent_id").notNull().references(() => agents.id),
  discipline: text("discipline").notNull().default("snake"),
  seed: text("seed").notNull(),
  config: jsonb("config").notNull(),
  status: text("status").notNull().default("queued"),
  // "queued" | "running" | "completed" | "error"
  score: integer("score"),
  ticksPlayed: integer("ticks_played"),
  terminationReason: text("termination_reason"),
  frames: jsonb("frames"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
})
```

### Hono Server with WebSocket Integration

```typescript
// packages/api/src/index.ts (updated for Phase 2)
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { serve } from "@hono/node-server"
import { createNodeWebSocket } from "@hono/node-ws"

const app = new Hono()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

// CORS only on API routes -- NOT on WebSocket routes
app.use("/api/*", logger())
app.use("/api/*", cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  credentials: true,
}))

// ... existing routes ...

// WebSocket route (outside /api/* to avoid CORS conflict)
app.get(
  "/ws/matches/:matchId/spectate",
  upgradeWebSocket((c) => {
    const matchId = c.req.param("matchId")
    return {
      onOpen(_event, ws) { /* subscribe to Redis channel */ },
      onMessage(event, ws) { /* handle client commands like pause/resume */ },
      onClose() { /* cleanup subscription */ },
    }
  })
)

const server = serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3001) })
injectWebSocket(server)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas 2D for game rendering | PixiJS 8 (WebGL2/WebGPU) | PixiJS v8 launched 2024 | 3x performance, TypeScript-native, single import root |
| Socket.IO for real-time | Native WebSocket + @hono/node-ws | 2024-2025 | No polling fallback overhead, smaller bundle, integrates with Hono |
| Manual JSON Schema | Zod schemas -> zod-to-json-schema | 2024-2025 | Single source of truth, types and schema always in sync |
| zod-to-json-schema (external) | Zod v4 native `z.toJSONSchema()` | Announced late 2025 | First-party support eliminates dependency. Not yet adopted in this project (uses Zod 3.24) |
| Math.random() for game randomness | Seeded PRNG (prando) | Standard practice | Deterministic replays, reproducible testing |

**Deprecated/outdated:**
- **vm2**: Still deprecated, still has CVEs. Continue using isolated-vm.
- **PixiJS v7**: v8 is stable and production-ready. No reason to use v7.
- **Socket.IO**: Unnecessary for modern browsers that all support WebSocket natively.

## Open Questions

1. **Redis deployment for development**
   - What we know: Redis is needed for BullMQ and pub/sub. docker-compose.yml already has PostgreSQL.
   - What's unclear: Whether to add Redis to existing docker-compose.yml or use a separate service.
   - Recommendation: Add Redis to the existing docker-compose.yml. Simple configuration, same startup command.

2. **Match execution: in-process vs. separate worker**
   - What we know: BullMQ supports both in-process workers and separate worker processes.
   - What's unclear: Whether Phase 2 volume justifies a separate worker process.
   - Recommendation: Start with in-process BullMQ worker in the API server for Phase 2 simplicity. Extract to separate process if match execution causes API latency issues. BullMQ makes this extraction trivial.

3. **Frame broadcast rate for live spectating**
   - What we know: Snake ticks run at ~10-20 ticks/second. WebSocket can handle this easily.
   - What's unclear: Optimal tick rate for spectator experience (too fast = unreadable, too slow = boring).
   - Recommendation: Run engine at configurable tick rate (default: 5 ticks/second for Snake). Send every frame to spectators. Client can interpolate or skip frames for smoothness. Start simple, tune based on user feedback.

4. **Isolate reuse strategy within a match**
   - What we know: Current `executeInSandbox` creates and disposes an isolate per call. This is too expensive for 500-tick matches.
   - What's unclear: Exact API for reusing an isolate context across calls.
   - Recommendation: Create a `MatchSandbox` class that holds an isolate and context, compiles the agent script once, and exposes a `callMove(state)` method. Dispose at match end. The isolated-vm API supports this directly.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` (exists at root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx turbo test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAME-01 | Snake engine produces valid game with correct collision/scoring | unit | `npx vitest run packages/engine/src/disciplines/snake/__tests__/engine.test.ts` | No -- Wave 0 |
| GAME-01 | Snake engine is deterministic (same seed = same result) | unit | `npx vitest run packages/engine/src/disciplines/snake/__tests__/determinism.test.ts` | No -- Wave 0 |
| GAME-01 | Match runner executes agent in sandbox and records frames | integration | `npx vitest run packages/api/src/__tests__/match-runner.test.ts` | No -- Wave 0 |
| GAME-03 | Zod schemas produce valid JSON Schema | unit | `npx vitest run packages/shared/src/specs/__tests__/snake-schema.test.ts` | No -- Wave 0 |
| GAME-03 | Starter agent compiles and runs in sandbox | integration | `npx vitest run packages/engine/src/__tests__/starter-agent.test.ts` | No -- Wave 0 |
| SPEC-01 | WebSocket connection receives live match frames | integration | `npx vitest run packages/api/src/__tests__/spectate-ws.test.ts` | No -- Wave 0 |
| SPEC-02 | Completed match replay serves all frames | integration | `npx vitest run packages/api/src/__tests__/replay.test.ts` | No -- Wave 0 |
| SPEC-03 | Agent reasoning field appears in frame data | unit | `npx vitest run packages/engine/src/disciplines/snake/__tests__/engine.test.ts -t "reasoning"` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --changed`
- **Per wave merge:** `npx turbo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/engine/src/disciplines/snake/__tests__/engine.test.ts` -- core Snake engine tests
- [ ] `packages/engine/src/disciplines/snake/__tests__/determinism.test.ts` -- determinism verification
- [ ] `packages/shared/src/specs/__tests__/snake-schema.test.ts` -- schema generation tests
- [ ] `packages/api/src/__tests__/match-runner.test.ts` -- match execution integration test
- [ ] `packages/api/src/__tests__/spectate-ws.test.ts` -- WebSocket spectating test
- [ ] `packages/api/src/__tests__/replay.test.ts` -- replay endpoint test
- [ ] Redis added to docker-compose.yml for test environment
- [ ] `npm install prando @hono/node-ws bullmq ioredis zod-to-json-schema` in relevant packages
- [ ] `npm install pixi.js` in apps/web

## Sources

### Primary (HIGH confidence)

- [PixiJS v8 Application docs](https://pixijs.com/8.x/guides/components/application) -- async init pattern, constructor + init() API
- [PixiJS npm v8.17.x](https://www.npmjs.com/package/pixi.js) -- latest version verification
- [Hono WebSocket Helper docs](https://hono.dev/docs/helpers/websocket) -- upgradeWebSocket API, event handlers
- [@hono/node-ws GitHub](https://github.com/honojs/middleware/tree/main/packages/node-ws) -- createNodeWebSocket setup, injectWebSocket pattern
- [Prando GitHub](https://github.com/zeh/prando) -- deterministic PRNG API, seed reset, TypeScript support
- [BullMQ Quick Start](https://docs.bullmq.io/readme-1) -- Queue + Worker setup, TypeScript integration
- [Zod JSON Schema docs](https://zod.dev/json-schema) -- native toJSONSchema() in Zod v4
- [zod-to-json-schema npm](https://www.npmjs.com/package/zod-to-json-schema) -- bridge for Zod 3.x

### Secondary (MEDIUM confidence)

- [PixiJS + Next.js SSR issue](https://github.com/pixijs/pixijs/issues/6990) -- window is undefined, dynamic import fix
- [Deterministic Physics in TS](https://dev.to/shaisrc/deterministic-physics-in-ts-why-i-wrote-a-fixed-point-engine-4b0l) -- integer-only math for determinism
- [Game Loop pattern](https://gameprogrammingpatterns.com/game-loop.html) -- tick-based game loop architecture
- [Colyseus + PixiJS multiplayer architecture](https://arnauld-alex.com/guiding-the-flock-building-a-realtime-multiplayer-game-architecture-in-typescript) -- real-time game state broadcasting patterns

### Tertiary (LOW confidence)

- [PixiJS snake game tutorial](https://jaymeh.co.uk/pixijs-getting-started) -- basic snake rendering with PixiJS (older version)
- [@hono/node-ws npm](https://www.npmjs.com/package/@hono/node-ws) -- version 1.3.0 confirmed but full API docs not accessible via npm page

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries are locked decisions from STACK.md (PixiJS, Hono, Redis/BullMQ). New additions (prando, @hono/node-ws, zod-to-json-schema) are well-documented and verified
- Architecture: HIGH -- Game engine tick loop is a well-understood pattern. WebSocket + Redis pub/sub is standard real-time architecture. Frame recording for replays is straightforward
- Pitfalls: HIGH -- PixiJS SSR issues are documented in official GitHub issues. Determinism requirements are well-known in game development. Isolate reuse performance is validated by Screeps architecture
- Rendering: MEDIUM -- PixiJS 8 in Next.js with dynamic import is the standard pattern, but exact integration with React 19 needs hands-on validation

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable stack, 30-day validity)
