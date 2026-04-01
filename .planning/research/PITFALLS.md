# Domain Pitfalls

**Domain:** Competitive AI Gaming Platform (AI Agent Arena)
**Researched:** 2026-04-01

## Critical Pitfalls

Mistakes that cause rewrites, security breaches, or platform abandonment.

### Pitfall 1: JavaScript/TypeScript Sandbox Escapes

**What goes wrong:** Using in-process sandboxing (vm2, isolated-vm, safe-eval, `new Function()`) for running untrusted user code. These libraries share the host Node.js process and have a long history of sandbox escape CVEs. vm2 was officially deprecated in 2023 after multiple critical escapes. isolated-vm is better but still shares the host kernel. Attackers exploit prototype chain traversal, Function constructor access, and Error object handling to break out and achieve Remote Code Execution on the server.

**Why it happens:** In-process sandboxes are fast to set up and have low latency. Developers underestimate the attack surface of JavaScript's dynamic nature (prototype pollution, constructor access, `with()` scoping). The "it works in development" mindset ignores adversarial users who will actively try to escape.

**Consequences:** Full server compromise. Access to environment variables, filesystem, other users' code, database credentials. A single sandbox escape can expose every user on the platform. This is a game-over security incident.

**Prevention:**
- Use process-level or VM-level isolation from day one. Modern options (2025-2026): Firecracker microVMs (E2B), gVisor containers (Modal), Kata Containers (Northflank/Daytona), or Docker with seccomp + AppArmor profiles at minimum.
- Never run untrusted code in the same Node.js process as the platform.
- Enforce strict resource limits: CPU time, memory, no network access, no filesystem access outside workspace.
- Block network egress entirely for agent execution (agents should have no internet access).
- Use read-only filesystem mounts; agents get only their code and the game state interface.

**Detection:**
- If your architecture diagram shows "agent code" running inside the same process as "game engine" or "API server," you have this pitfall.
- If you are importing any npm package with "sandbox" or "safe-eval" in the name for production untrusted code execution, stop immediately.

**Phase:** Must be solved in Phase 1 (Foundation). The execution model is the most critical architectural decision and cannot be retrofitted.

**Confidence:** HIGH (multiple documented CVEs, vm2 deprecated, industry consensus on microVM isolation)

---

### Pitfall 2: Non-Deterministic Game Simulation Breaking Replays

**What goes wrong:** The game engine produces different results when replaying the same inputs. Replays show different outcomes than what actually happened. Match results become unreproducible, undermining competitive integrity and making the replay system useless.

**Why it happens:** Sources of non-determinism in JavaScript/TypeScript include:
- `Math.random()` without seeded PRNG
- `Date.now()` or timing-dependent logic
- Object iteration order assumptions (historically unreliable, now spec'd but still risky with Maps/Sets)
- Floating-point arithmetic differences across platforms/V8 versions
- `Promise.race()` or any concurrency-dependent ordering
- Hash map iteration in different JS engine versions
- `setTimeout`/`setInterval` timing variance

**Consequences:** Replays diverge from actual match results ("desync"). Players lose trust in the platform. Competitive disputes become unresolvable. The replay feature -- a core product pillar -- becomes unreliable. Desync bugs are notoriously hard to diagnose because the divergence may start small and compound over hundreds of turns before becoming visible.

**Prevention:**
- Use a seeded PRNG (e.g., a simple mulberry32 or xoshiro implementation) for all randomness. Seed is stored per match.
- Make the game engine purely functional: `(state, actions) => newState` with zero side effects.
- Ban `Date.now()`, `Math.random()`, and any timing-dependent APIs from the game engine.
- Use integer math where possible; when floats are needed, use fixed-point arithmetic or ensure identical V8 versions for simulation and replay.
- Store the complete action log per turn, not snapshots. Replay = re-execute engine with stored actions.
- Add checksum verification: hash game state every N turns during live play and during replay. If checksums diverge, you have a desync bug.
- Write regression tests that replay recorded matches and assert identical final states.

**Detection:**
- Run every match twice (once live, once as immediate replay) in CI and compare final states.
- If any test produces different results on re-run, you have non-determinism.
- Monitor for user reports of "the replay showed something different."

**Phase:** Must be solved in Phase 1 (Game Engine). The engine's determinism guarantee is foundational. Retrofitting determinism into a non-deterministic engine requires a full rewrite.

**Confidence:** HIGH (extensively documented in RTS game development, Factorio desync docs, Age of Empires post-mortems)

---

### Pitfall 3: Agent Specification Too Complex or Too Vague for AI Code Generation

**What goes wrong:** The agent specification (input/output format, rules, constraints) is either so complex that Claude Code cannot reliably generate valid agents, or so vague that generated agents break in unexpected ways at runtime. The core differentiator -- "Claude Code can autonomously create agents" -- fails.

**Why it happens:** Specifications designed by humans for humans use natural language ambiguity, implicit assumptions, and context that AI tools cannot infer. Conversely, over-engineering the spec with excessive edge cases makes it too complex for any tool to handle. Most AI programming competitions (Battlecode: 10+ page spec) optimize for human comprehension, not machine-parseable clarity.

**Consequences:** The primary user journey breaks. Users cannot get Claude Code to generate a working agent on the first try. Onboarding friction skyrockets. The platform loses its key differentiator and becomes "just another AI competition" where users must hand-code everything.

**Prevention:**
- Design specs as machine-readable schemas first, human-readable docs second. Use TypeScript interfaces as the canonical spec (not prose).
- Provide a complete, runnable agent skeleton that passes all validation. Claude Code should be able to modify the skeleton, not create from scratch.
- Include an `llms.txt` or equivalent machine-readable summary per discipline.
- Keep the agent interface surface tiny: one function signature (`(gameState: GameState) => Action`), exhaustive TypeScript types for `GameState` and `Action`, and JSON Schema for validation.
- Ship a local test harness so agents can be validated before upload.
- Test the spec by giving it to Claude Code cold (no prior context) and measuring how often it produces a valid agent. Target: >90% first-try success rate.
- Include 3-5 example agents of increasing complexity in the spec package.

**Detection:**
- If users frequently ask "why won't my agent upload?" or "the spec says X but the engine expects Y," the spec has ambiguity.
- Track first-upload success rate. If <70% of first uploads pass validation, the spec needs work.
- If Claude Code consistently generates agents that fail at runtime despite passing type-checks, the spec has implicit rules not captured in types.

**Phase:** Must be designed in Phase 1 (Agent System), iterated in Phase 2 (first discipline). The spec format is an API contract that cannot change without breaking all existing agents.

**Confidence:** HIGH (Halite's success attributed to simple specs; Addy Osmani's research on AI agent specs confirms machine-readability is critical)

---

### Pitfall 4: Unfair Compute Allocation Between Agents

**What goes wrong:** One agent gets more CPU time, memory, or wall-clock time than its opponent due to inconsistent resource enforcement. Results are determined by infrastructure variance, not agent quality.

**Why it happens:** Running agents in containers without strict resource limits. Using wall-clock time instead of CPU time for turn limits (garbage collection pauses, container scheduling jitter, noisy neighbors on shared hosts). Not accounting for JIT compilation warmup -- the first agent to run gets "cold" V8 while the second gets "warm" V8.

**Consequences:** Leaderboard rankings reflect infrastructure luck, not skill. Competitive integrity collapses. Users who discover the variance exploit it (e.g., submitting agents that trigger GC in opponents' containers). Community loses trust and leaves.

**Prevention:**
- Measure CPU time, not wall-clock time, for turn limits. Use `process.cpuUsage()` or cgroup CPU accounting.
- Run both agents in identical, isolated containers with identical resource limits (CPU shares, memory limits).
- Warm up V8/JIT before the match starts by running a dummy turn for each agent.
- Execute agents sequentially within each turn (not concurrently) to eliminate scheduling variance, or use dedicated CPU cores per agent.
- Set hard memory limits and kill agents that exceed them (treat as forfeit for that turn, not crash the match).
- Log resource usage per agent per turn for auditability and dispute resolution.

**Detection:**
- Run the same agent against itself 100 times. If win rates deviate significantly from 50%, you have a fairness problem.
- Monitor CPU time variance across matches. Standard deviation should be <5% for identical workloads.
- Track if agents that "go first" vs "go second" have statistically different win rates.

**Phase:** Must be designed in Phase 1 (Execution Infrastructure), validated in Phase 2 (first competitive discipline).

**Confidence:** HIGH (well-documented in competitive programming; Halite and Battlecode both addressed this explicitly)

---

### Pitfall 5: Spectator System as Afterthought

**What goes wrong:** The spectator/replay viewer is built as a thin visualization layer bolted onto the game engine after the fact. It lacks the data it needs to be visually engaging, the game state format is not designed for rendering, and the result is an ugly, confusing, unwatchable experience.

**Why it happens:** Engineers prioritize "making the game work" and treat visualization as a cosmetic layer. The game state is designed for agent consumption (minimal, efficient) not for human spectators (rich, annotated, animated). By the time the spectator UI is built, the game state format is locked and cannot provide the visual data needed.

**Consequences:** The spectator experience -- explicitly a core product feature, not an afterthought -- is boring and hard to understand. Non-technical users cannot follow matches. The viral "watch AI agents fight" moment never materializes. Community growth stalls because there is nothing shareable.

**Prevention:**
- Design the game state format to serve both agents AND spectators from the start. Include metadata that agents ignore but spectators need: animation hints, event types (attack, move, death), score deltas, turn highlights.
- Separate the agent-facing state (minimal, typed) from the spectator-facing state (enriched with visual metadata).
- Build the spectator viewer in parallel with the first discipline, not after it.
- Design for "screenshot-ability": at any frozen frame, a viewer should understand what is happening.
- Include playback controls from day one: play/pause, speed control, turn-by-turn stepping, timeline scrubbing.
- Test with non-technical users: can someone who does not know the game rules follow a match?

**Detection:**
- If the game state is a flat JSON blob with no event/animation metadata, the spectator experience will be poor.
- If you cannot explain a match turn to a non-developer by looking at the state diff, the state format is not spectator-ready.
- If building the spectator UI requires reverse-engineering game logic to infer what happened, the format is wrong.

**Phase:** Must be co-designed in Phase 1 (Game State Format) and built in Phase 2 (Spectator MVP alongside first discipline).

**Confidence:** HIGH (PROJECT.md explicitly states spectating is a core feature; this is the most common mistake in AI competition platforms which typically have ugly ASCII viewers)

## Moderate Pitfalls

### Pitfall 6: Monolithic Game Engine That Cannot Support Multiple Disciplines

**What goes wrong:** The first discipline (Snake) is built as a tightly coupled engine where game rules, state management, agent interface, and rendering logic are intertwined. Adding the second discipline (Territory War) requires duplicating large portions of code or performing a major refactor.

**Prevention:**
- Define a discipline-agnostic engine interface from the start: `DisciplinePlugin { rules, initialState, validateAction, applyAction, isTerminal, getScore }`.
- The execution runtime should know nothing about Snake or Territory War. It orchestrates turns and delegates to the discipline plugin.
- Each discipline is a self-contained module that implements the plugin interface.
- Test with at least two disciplines in mind before finalizing the engine architecture.

**Detection:** If adding the second discipline requires changes to the execution runtime (not just adding a new plugin), the architecture is too coupled.

**Phase:** Architecture must be plugin-based from Phase 1. Validated when Phase 3 adds Territory War.

**Confidence:** MEDIUM (standard software architecture principle, but specific to this domain's multi-discipline requirement)

---

### Pitfall 7: Agent Upload Without Validation Pipeline

**What goes wrong:** Users upload agent code that passes TypeScript type-checking but fails at runtime: infinite loops, stack overflows, exceptions on edge cases, exceeds memory limits, or contains malicious payloads. The platform either crashes, hangs, or produces corrupt match results.

**Prevention:**
- Build a multi-stage validation pipeline: (1) static analysis / lint, (2) type-check against agent interface, (3) run against a battery of test scenarios in sandbox, (4) verify resource compliance (terminates within time limit, stays within memory).
- Reject agents that fail any stage with clear, actionable error messages.
- Provide the same validation harness locally so users can test before uploading.
- Set a maximum code size limit (e.g., 1MB) to prevent abuse.
- Scan for obvious malicious patterns (network access attempts, filesystem access, process spawning).

**Detection:** If agents that pass upload validation frequently crash during matches, the validation pipeline is too weak.

**Phase:** Phase 2 (Agent Upload System). Must exist before the platform accepts public uploads.

**Confidence:** HIGH (every code execution platform faces this)

---

### Pitfall 8: Cold Start / Empty Platform Problem

**What goes wrong:** The platform launches with zero users. New users arrive, find no opponents to challenge, no replays to watch, no leaderboard entries, and leave immediately. The platform never reaches critical mass.

**Prevention:**
- Ship built-in "house bots" at multiple skill levels per discipline. New users can immediately challenge the platform's own agents.
- Pre-populate the replay gallery with interesting matches between house bots.
- Include a "vs environment" mode (Snake is good for this) that does not require opponents.
- Design the challenge system to work asynchronously: challenges can be sent and resolved without both users being online simultaneously.
- Seed the leaderboard with house bots so it is not empty on day one.
- Focus initial community building on a single niche (e.g., Claude Code users, one Discord community) rather than broad launch.

**Detection:** If >50% of new signups never complete a single match, the cold start problem is killing retention.

**Phase:** Must be planned in Phase 2 (first discipline), implemented by Phase 3 (competitive features).

**Confidence:** MEDIUM (general platform problem, specific mitigations drawn from Halite and competitive programming platforms)

---

### Pitfall 9: Overly Complex Match State Leading to Spectator Latency

**What goes wrong:** The full game state per turn is large (e.g., full grid state for Territory War). Streaming this in real-time to spectators creates bandwidth issues, rendering lag, and poor UX. At scale, even a few hundred concurrent spectators overwhelm the WebSocket server.

**Prevention:**
- Send state diffs (deltas) to spectators, not full state snapshots. Only transmit what changed per turn.
- Implement server-side spectator state aggregation: one game simulation, one spectator stream, fan out via pub/sub.
- Use a dedicated spectator service that subscribes to match events, separate from the game execution service.
- Set a reasonable turn rate for spectator mode (e.g., 4-10 turns/second visually) even if the engine runs faster internally. Batch turns for spectator delivery.
- Consider CDN/edge distribution for spectator streams at scale.

**Detection:** If spectator frame rate drops below game turn rate, or if adding spectators increases match execution time, the architecture has coupling issues.

**Phase:** Phase 2-3 (Spectator System design). Must be delta-based from the start.

**Confidence:** MEDIUM (standard real-time systems challenge, specific to the stated spectator-first product vision)

---

### Pitfall 10: No Agent Versioning Leading to "It Worked Before" Frustration

**What goes wrong:** Users upload a new version of their agent, and the old version is permanently lost. They cannot A/B test versions, revert to a known-good version, or understand why performance changed. The platform also cannot re-run historical matches for verification.

**Prevention:**
- Store every uploaded agent version immutably. Agents are identified by `(userId, agentId, version)`.
- Users select which version is "active" for challenges, but all versions are retained.
- Match records reference specific agent versions, not just agent IDs.
- Provide a "challenge my own agent" feature so users can pit v2 against v1.

**Detection:** If users ask "can I go back to my previous agent?" and the answer is no, this pitfall was not addressed.

**Phase:** Phase 2 (Agent Management). Must be in the data model from the start even if UI is basic.

**Confidence:** HIGH (PROJECT.md lists "versioning, performance stats" as a requirement)

## Minor Pitfalls

### Pitfall 11: Turn Timeout Granularity Mismatch

**What goes wrong:** Turn timeouts are too generous (agents can stall matches) or too strict (legitimate complex strategies get killed). A single timeout value does not work across different disciplines with different computational demands.

**Prevention:**
- Make timeout configurable per discipline.
- Distinguish between "thinking time" (CPU time for decision) and "total turn time" (including I/O overhead).
- Implement a "time bank" system where agents accumulate unused time across turns, allowing occasional expensive turns without penalizing consistently fast agents.
- Default to generous timeouts initially, then tighten based on observed agent behavior.

**Phase:** Phase 2 (per-discipline configuration).

**Confidence:** MEDIUM

---

### Pitfall 12: Insufficient Error Reporting to Agent Developers

**What goes wrong:** An agent crashes during a match and the developer gets only "Agent crashed on turn 47" with no stack trace, no game state at the time of crash, and no way to reproduce the issue locally.

**Prevention:**
- Capture and store stderr/stdout from agent execution per turn (with size limits).
- On crash, include: the game state that was passed to the agent, the error/stack trace, resource usage at time of crash.
- Provide a "debug replay" mode that shows agent logs alongside the match replay.
- Ensure the local test harness can reproduce any match by re-running with the same seed and opponent actions.

**Phase:** Phase 2-3 (Developer Experience).

**Confidence:** HIGH (universal developer tool requirement)

---

### Pitfall 13: Leaderboard Gaming via Selective Challenges

**What goes wrong:** In a challenge-based system (no matchmaking), users game the leaderboard by only challenging weaker opponents and avoiding stronger ones. ELO/rating inflation occurs.

**Prevention:**
- Weight rating changes by opponent strength (standard ELO).
- Show number of matches played alongside rating to surface "cherry-pickers."
- Consider requiring a minimum number of matches against diverse opponents for leaderboard placement.
- Add "random challenge" feature that matches against a random opponent near your rating.
- Defer complex anti-gaming measures; for MVP, transparency (visible match history) is sufficient.

**Phase:** Phase 3 (Leaderboard System).

**Confidence:** MEDIUM (well-known competitive gaming problem, but challenge-based MVP may not need full solution immediately)

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Execution Infrastructure | Sandbox escape (Pitfall 1) | Use microVM/container isolation, never in-process sandboxing |
| Phase 1: Game Engine | Non-determinism (Pitfall 2) | Seeded PRNG, pure functional engine, checksum verification |
| Phase 1: Architecture | Monolithic engine (Pitfall 6) | Plugin-based discipline interface from day one |
| Phase 2: Agent Spec | Spec not machine-readable (Pitfall 3) | TypeScript interfaces as canonical spec, test with Claude Code |
| Phase 2: Agent Upload | No validation pipeline (Pitfall 7) | Multi-stage validation before accepting agents |
| Phase 2: Spectator | Afterthought design (Pitfall 5) | Co-design state format for agents AND spectators |
| Phase 2: Fairness | Compute imbalance (Pitfall 4) | CPU time limits, identical containers, JIT warmup |
| Phase 3: Community | Cold start (Pitfall 8) | House bots, pre-populated replays, async challenges |
| Phase 3: Leaderboard | Rating gaming (Pitfall 13) | ELO weighting, match count transparency |
| Phase 3: Scale | Spectator latency (Pitfall 9) | State deltas, dedicated spectator service, batched turns |

## Sources

- [Awesome Sandbox - GitHub compilation of sandboxing solutions](https://github.com/restyler/awesome-sandbox)
- [NVIDIA Practical Security Guidance for Sandboxing Agentic Workflows](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/)
- [RCE via Insecure JS Sandbox Bypass](https://medium.com/@win3zz/rce-via-insecure-js-sandbox-bypass-a26ad6364112)
- [Better Stack: Best Sandbox Runners 2026](https://betterstack.com/community/comparisons/best-sandbox-runners/)
- [Northflank: Top AI Sandbox Platforms 2026](https://northflank.com/blog/top-ai-sandbox-platforms-for-code-execution)
- [Synchronous RTS Engines and a Tale of Desyncs](https://www.forrestthewoods.com/blog/synchronous_rts_engines_and_a_tale_of_desyncs/)
- [Factorio Desynchronization Wiki](https://wiki.factorio.com/Desynchronization)
- [Addy Osmani: How to Write a Good Spec for AI Agents](https://addyosmani.com/blog/good-spec/)
- [Halite AI Programming Competition - Two Sigma](https://www.twosigma.com/articles/introducing-halite-our-limited-release-ai-challenge/)
- [Battlecode 2020 Postmortem](https://stonet2000.github.io/battlecode/2020/)
- [AI Survey of Programming Challenges](https://blog.stoneztao.com/posts/ai-challenge-survey/)
- [Valve: Latency Compensating Methods in Game Protocol Design](https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization)
