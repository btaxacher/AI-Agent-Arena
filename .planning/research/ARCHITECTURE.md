# Architecture Patterns

**Domain:** Competitive AI Agent Gaming Platform
**Researched:** 2026-04-01

## Recommended Architecture

The platform follows a **service-oriented monolith** pattern: a single deployable Node.js application with clearly separated internal modules that can be extracted into services later if needed. This avoids premature microservice complexity while maintaining clean boundaries for the MVP.

```
                    +------------------+
                    |   Web Frontend   |
                    |  (Next.js App)   |
                    +--------+---------+
                             |
                    +--------+---------+
                    |    API Gateway    |
                    | (Next.js API /    |
                    |  tRPC or REST)    |
                    +--------+---------+
                             |
          +------------------+------------------+
          |                  |                  |
+---------+------+  +--------+-------+  +-------+--------+
| Match Engine   |  | Agent Manager  |  | User/Auth      |
| (Game Loop,    |  | (Upload,       |  | (Accounts,     |
|  Simulation,   |  |  Versioning,   |  |  Challenges,   |
|  Replay Record)|  |  Validation)   |  |  Leaderboards) |
+--------+-------+  +--------+-------+  +----------------+
         |                   |
+--------+-------+  +--------+-------+
| Sandbox Runner |  | Agent Storage  |
| (QuickJS WASM  |  | (File system / |
|  or isolated-  |  |  S3 bucket)    |
|  vm)           |  +----------------+
+--------+-------+
         |
+--------+-------+
| Event Log      |
| (Match events  |
|  for replay)   |
+----------------+

WebSocket Server -----> Spectator Clients (live + replay)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Web Frontend** | Game visualization (canvas/WebGL), spectator UI, agent upload UI, leaderboards, user dashboard | API Gateway (HTTP), WebSocket Server (WS) |
| **API Gateway** | REST/tRPC endpoints, authentication middleware, rate limiting, request validation | All backend modules |
| **Match Engine** | Game simulation loop, rule enforcement, turn execution, event recording | Sandbox Runner, Event Log, WebSocket Server |
| **Sandbox Runner** | Isolated execution of agent TypeScript code, resource limits (CPU time, memory) | Match Engine (called by), Agent Storage (loads code from) |
| **Agent Manager** | Agent upload/validation, version control, spec compliance checking | Agent Storage, API Gateway |
| **Agent Storage** | Persists agent source code and compiled bundles | Agent Manager, Sandbox Runner |
| **Event Log** | Append-only match event storage for replays | Match Engine (writes), Replay Service (reads) |
| **WebSocket Server** | Broadcasts live game state to spectators, serves replay playback | Match Engine (receives events), Web Frontend (sends to) |
| **User/Auth Module** | Accounts, challenge system, leaderboard computation | API Gateway, Database |
| **Database** | PostgreSQL -- users, agents metadata, match results, leaderboards, challenges | All backend modules |

### Data Flow

**Match Execution Flow (the critical path):**

```
1. Challenge accepted --> Match Engine creates match instance
2. Match Engine loads both agents from Agent Storage
3. Match Engine initializes game state (grid, resources, etc.)
4. Per turn:
   a. Match Engine serializes game state to agent-visible input
   b. Sandbox Runner executes Agent A's code with input --> gets action
   c. Sandbox Runner executes Agent B's code with input --> gets action
   d. Match Engine validates actions, applies rules, updates state
   e. Match Engine emits turn event to Event Log (append-only)
   f. Match Engine broadcasts state delta to WebSocket Server
5. Game ends --> Match Engine writes final result to Database
6. Event Log is sealed as immutable replay data
```

**Spectator Flow:**

```
Client connects via WebSocket -->
  If live match: receives real-time state deltas as they happen
  If replay: server reads Event Log, streams events at configurable speed
Client renders each state on canvas (grid visualization)
```

**Agent Upload Flow:**

```
User uploads .ts file (UI or API) -->
  Agent Manager validates syntax (TypeScript compiler) -->
  Agent Manager checks spec compliance (exports correct function signature) -->
  Agent Manager bundles/compiles to JS -->
  Stored in Agent Storage with version number -->
  Previous versions preserved for rollback
```

**Programmatic API Flow (Claude Code integration):**

```
External tool (Claude Code) -->
  GET /api/disciplines/:id/spec  (machine-readable game rules)
  POST /api/agents/upload         (submit agent code)
  GET /api/agents/:id/matches     (retrieve match history)
  POST /api/challenges            (challenge another user)
  GET /api/matches/:id/events     (replay data as JSON)
  WS /api/matches/:id/spectate    (live WebSocket stream)
```

## Critical Architecture Decisions

### 1. Sandbox Strategy: QuickJS-WASM (PRIMARY) with isolated-vm (FALLBACK)

**Confidence: MEDIUM** -- QuickJS WASM is the best balance of security and simplicity for this use case.

**Why QuickJS WASM ([@aspect-build/quickjs](https://github.com/aspect-build/aspect-cli) or [sebastianwessel/quickjs](https://github.com/sebastianwessel/quickjs)):**
- True isolation via WebAssembly -- agent code cannot escape the WASM sandbox
- Supports TypeScript execution (compile TS to JS, run in QuickJS)
- Deterministic execution (no event loop, no async, no timers) -- critical for fair competition and replay determinism
- Resource limits enforceable (memory cap, instruction count limit)
- No access to Node.js APIs, file system, network by default
- Same sandbox on every platform -- no OS-specific security concerns

**Why NOT vm2:** Deprecated, critical CVE-2026-22709 sandbox escape vulnerability. Do not use.

**Why NOT isolated-vm as primary:** More complex setup, still shares process memory space (though separate V8 heap). Good as fallback if QuickJS performance is insufficient.

**Why NOT microsandbox/microVMs:** Overkill for turn-based games with simple agent code. Sub-200ms startup is good but still slower than in-process QuickJS. Consider for v2+ when agents become more complex.

**Why NOT Cloudflare Workers/Workerd:** External dependency, adds network latency per turn, cost at scale. Good for v2+ if self-hosted execution becomes problematic.

**Agent execution model:**
```typescript
// Agent receives serialized game state, returns an action
// This is the ENTIRE interface an agent implements
interface AgentFunction {
  (state: GameState): AgentAction
}

// Executed in QuickJS sandbox with:
// - 50ms CPU time limit per turn
// - 16MB memory limit
// - No network, no filesystem, no timers
// - Deterministic (same input = same output)
```

### 2. Game Simulation: Deterministic Turn-Based Engine

**Confidence: HIGH** -- well-established pattern in AI competition platforms (Halite, Battlecode).

The Match Engine must be **fully deterministic**: given the same initial state and agent actions, the game must produce identical results. This is critical for:
- Fair competition (no randomness advantage)
- Replay accuracy (re-simulate from event log)
- Debugging (reproducible matches)

**Implementation:**
- Seeded PRNG (pseudo-random number generator) when randomness is needed (e.g., map generation)
- Synchronous, turn-based execution (no race conditions)
- All state transitions are pure functions: `(state, actions) => newState`
- No floating-point arithmetic in game logic (use integers for positions, scores)

**Discipline abstraction:**
```typescript
interface GameDiscipline {
  id: string
  name: string
  createInitialState(seed: number, config: DisciplineConfig): GameState
  validateAction(state: GameState, action: AgentAction): ValidationResult
  applyActions(state: GameState, actions: AgentAction[]): GameState
  isGameOver(state: GameState): boolean
  getResult(state: GameState): MatchResult
  serializeForAgent(state: GameState, agentId: string): AgentView
  serializeForSpectator(state: GameState): SpectatorView
}
```

This interface allows adding new disciplines (Snake, Territory War, future games) without changing the Match Engine. Each discipline is a plugin.

### 3. Replay System: Event Sourcing (Input Recording)

**Confidence: HIGH** -- standard approach for deterministic game replays.

Record **inputs only** (agent actions per turn + initial seed), not full state snapshots. Because the simulation is deterministic, replays can be reconstructed by re-running the simulation with recorded inputs.

**Storage format:**
```typescript
interface MatchReplay {
  matchId: string
  disciplineId: string
  disciplineVersion: string
  seed: number
  config: DisciplineConfig
  agents: { id: string; version: string }[]
  turns: {
    turnNumber: number
    actions: Record<string, AgentAction>  // agentId -> action
    // Optional: computed state snapshot every N turns for fast seeking
  }[]
  result: MatchResult
  recordedAt: string
}
```

**Advantages over state snapshots:**
- Tiny storage footprint (kilobytes vs megabytes per match)
- Perfect accuracy (no state approximation)
- Supports variable-speed playback (client-side simulation speed)
- Enables "what if" analysis (modify one agent's action, re-simulate)

**Trade-off:** Replay playback requires running the simulation. For fast seeking, store periodic state snapshots (every 50 turns) as checkpoints.

### 4. Live Spectating: WebSocket with State Deltas

**Confidence: HIGH** -- standard pattern for real-time game viewing.

```
Match Engine --[turn event]--> WebSocket Hub --[broadcast]--> Connected Clients
```

**Protocol:**
- Client connects to `ws://host/matches/:id/spectate`
- Server sends initial full state
- Each turn, server sends state delta (changed cells only for grid games)
- Client maintains local state, applies deltas, renders

**For grid-based games (Territory War):** Only send changed cells per turn, not the full grid. A 50x50 grid with 5 changes per turn = ~200 bytes vs ~10KB for full state.

**Scaling:** For MVP, a single Node.js process handles WebSocket connections. At scale, use Redis pub/sub to fan out events across multiple WebSocket server instances.

### 5. Frontend Rendering: HTML Canvas (not WebGL)

**Confidence: HIGH** -- grid-based games do not need 3D rendering.

- HTML Canvas 2D for grid rendering (Snake, Territory War)
- Simple sprite/tile rendering, no physics engine needed
- 60fps achievable for grid sizes up to 200x200
- Canvas is simpler to implement than WebGL and sufficient for 2D grids
- Consider Pixi.js only if visual fidelity requirements increase significantly

## Patterns to Follow

### Pattern 1: Discipline Plugin System
**What:** Each game type implements a standard interface. The Match Engine is game-agnostic.
**When:** Adding any new game discipline.
**Why:** Prevents the Match Engine from becoming a monolith of game-specific logic. New games are isolated modules.

### Pattern 2: Command Pattern for Agent Actions
**What:** Agent actions are serializable data objects (not function calls). The engine validates and applies them.
**When:** Every agent turn.
**Why:** Enables replay recording, validation, and spectator broadcasting. Actions are data, not behavior.

### Pattern 3: Specification-as-Code
**What:** Discipline specifications are machine-readable JSON/TypeScript schemas, not just human documentation.
**When:** Agent development, upload validation, Claude Code integration.
**Why:** Claude Code (and other AI tools) can parse the spec programmatically to generate valid agents. This is a key differentiator.

```typescript
// Discipline spec is both documentation AND validation schema
interface DisciplineSpec {
  id: string
  name: string
  description: string
  rules: string  // human-readable markdown
  inputSchema: JSONSchema  // what the agent receives
  outputSchema: JSONSchema  // what the agent must return
  constraints: {
    maxResponseTimeMs: number
    maxMemoryMB: number
    turnLimit: number
  }
  exampleInput: unknown
  exampleOutput: unknown
}
```

### Pattern 4: Optimistic Spectator Rendering
**What:** Spectator client renders immediately on receiving events, does not wait for confirmation.
**When:** Live match viewing.
**Why:** Minimizes perceived latency. Since the server is authoritative and events are finalized, there is no need for reconciliation.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Running Agent Code in the Main Process
**What:** Executing user-uploaded TypeScript directly in the Node.js server process.
**Why bad:** A single malicious or buggy agent can crash the entire server, access environment variables, or consume all memory.
**Instead:** Always execute in QuickJS WASM sandbox or isolated-vm with strict resource limits.

### Anti-Pattern 2: Stateful WebSocket Connections for Game Logic
**What:** Using WebSocket messages from spectators to influence game state.
**Why bad:** Spectators are read-only observers. Mixing spectator input with game logic creates race conditions and security issues.
**Instead:** WebSocket connections for spectators are strictly one-way (server to client). Only the Match Engine modifies game state.

### Anti-Pattern 3: Non-Deterministic Game Logic
**What:** Using `Math.random()`, `Date.now()`, or `setTimeout` in game simulation code.
**Why bad:** Breaks replay accuracy, makes debugging impossible, creates fairness issues.
**Instead:** Use seeded PRNG, fixed turn durations, synchronous execution only.

### Anti-Pattern 4: Storing Full State Snapshots for Every Turn
**What:** Recording the complete game state each turn for replays.
**Why bad:** Storage grows linearly with grid size and turn count. A 100x100 grid over 1000 turns = ~40MB per match.
**Instead:** Store inputs only (event sourcing). Add periodic snapshots for fast seeking.

### Anti-Pattern 5: Premature Microservices
**What:** Splitting Match Engine, Agent Manager, Auth into separate deployable services from day one.
**Why bad:** Adds deployment complexity, network latency, distributed debugging overhead for a team of one.
**Instead:** Service-oriented monolith with clean module boundaries. Extract services when a specific component needs independent scaling.

## Suggested Build Order (Dependencies)

The architecture has clear dependency chains that dictate build order:

```
Phase 1: Foundation (no game yet)
  Database schema + User auth + Basic API
  Agent upload + storage + validation pipeline
  QuickJS sandbox proof-of-concept

Phase 2: First Game (Snake - single agent, simpler)
  Discipline interface + Snake implementation
  Match Engine (game loop, sandbox integration)
  Event Log (replay recording)
  Basic Canvas renderer

Phase 3: Spectating + Replay
  WebSocket server for live spectating
  Replay playback from Event Log
  Speed control, seeking via checkpoints

Phase 4: Competition (Territory War - agent vs agent)
  Territory War discipline implementation
  Challenge system (user-to-user)
  Leaderboards

Phase 5: Programmatic API
  REST API for external tools
  Machine-readable discipline specs
  Claude Code integration docs
```

**Dependency rationale:**
- Sandbox must work before any game can run (agents need isolation)
- Snake is simpler than Territory War (single agent vs environment, no PvP)
- Replay system needs the Event Log which needs the Match Engine
- Live spectating and replay share the same WebSocket infrastructure
- Territory War needs the challenge system which needs user accounts
- Programmatic API is a layer on top of existing functionality

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Match execution | Single process, sequential matches | Worker pool (Node.js cluster), parallel matches | Dedicated match worker fleet, queue-based dispatch |
| WebSocket connections | Single process handles all | Redis pub/sub for fan-out across instances | Dedicated WebSocket edge servers |
| Agent storage | Local filesystem | S3 or equivalent object storage | CDN-backed object storage |
| Replay storage | PostgreSQL JSONB column | PostgreSQL + S3 for large replays | S3 with metadata in PostgreSQL |
| Database | Single PostgreSQL instance | Read replicas | Sharded PostgreSQL or managed service |
| Sandbox overhead | QuickJS in-process | QuickJS worker pool | microVM-based isolation (microsandbox) |

## Technology Mapping

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend | Next.js (App Router) | SSR for SEO, API routes, React ecosystem |
| API | tRPC or Next.js API Routes | Type-safe, co-located with frontend |
| Database | PostgreSQL + Drizzle ORM | Reliable, JSONB for flexible data, type-safe ORM |
| Sandbox | QuickJS WASM (sebastianwessel/quickjs) | True WASM isolation, TS support, deterministic |
| WebSocket | ws library (or Socket.IO) | Native WebSocket for performance, Socket.IO if reconnection needed |
| Canvas rendering | HTML Canvas 2D API | Sufficient for grid games, simple API |
| Auth | NextAuth.js / Auth.js | Standard Next.js auth, OAuth providers |
| Hosting | Vercel (frontend) + Railway/Fly.io (workers) | Vercel for Next.js, separate compute for match execution |

## Sources

- [AI Arena Architecture Documentation](https://aiarena.github.io/general/architecture.html) -- reference architecture for bot competition platforms (HIGH confidence)
- [Halite AI Challenge](https://halite3webapp.azurewebsites.net/) -- Two Sigma's AI competition, replay system reference (HIGH confidence)
- [Battlecode](https://battlecode.org/) -- MIT's AI competition, deterministic simulation reference (HIGH confidence)
- [sebastianwessel/quickjs](https://github.com/sebastianwessel/quickjs) -- QuickJS WASM sandbox for TypeScript (MEDIUM confidence, needs validation)
- [Sandboxing JavaScript Code](https://healeycodes.com/sandboxing-javascript-code) -- comparison of sandbox approaches (MEDIUM confidence)
- [microsandbox](https://github.com/zerocore-ai/microsandbox) -- microVM-based sandboxing for future scaling (MEDIUM confidence)
- [CVE-2026-22709 vm2 vulnerability](https://www.endorlabs.com/learn/cve-2026-22709-critical-sandbox-escape-in-vm2-enables-arbitrary-code-execution) -- confirms vm2 must not be used (HIGH confidence)
- [Event Sourcing - Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html) -- replay system pattern (HIGH confidence)
- [Google Cloud Real-time Gaming Architecture](https://cloud.google.com/architecture/real-time-gaming-with-node-js-websocket) -- WebSocket game architecture reference (HIGH confidence)
- [Sandbox isolation discussion](https://www.shayon.dev/post/2026/52/lets-discuss-sandbox-isolation/) -- current landscape of JS sandboxing (MEDIUM confidence)
