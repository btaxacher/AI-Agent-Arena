# Feature Landscape

**Domain:** Competitive AI Agent Gaming Platform
**Researched:** 2026-04-01
**Overall confidence:** HIGH (based on analysis of 10+ existing platforms)

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Agent upload & management | Every platform (CodinGame, Battlecode, Halite, Terminal) requires this. Users need to submit code and manage versions. | Medium | Support file upload + GitHub URL per PROJECT.md. Version history is expected. |
| Clear game specification docs | Battlecode, Halite, Lux AI all provide detailed specs (input format, output format, rules, constraints). Without this, nobody can build an agent. | Low | Machine-readable specs are critical for the Claude Code integration differentiator. JSON Schema or similar. |
| Match replay system | Halite, CodinGame, Battlecode, Terminal all have replay viewers. Users MUST be able to review what happened. | High | Requires recording full game state per tick. Speed control (0.5x-8x) is standard. |
| Leaderboard per discipline | CodinGame, Halite, Terminal, Battlecode all have rankings. ELO/TrueSkill rating is standard. | Medium | Per-discipline ranking. Show rank, rating, win/loss, matches played. |
| User accounts & profiles | Universal across all platforms. | Low | OAuth (GitHub at minimum). Display agent history, match stats, rating. |
| Starter kits / agent templates | Battlecode, Lux AI, Terminal, CodinGame all provide starter code. Reduces barrier to entry massively. | Low | TypeScript skeleton per discipline with types, example logic, local test runner. |
| Local development & testing | Halite, Battlecode, Terminal, Lux AI all provide local runners so users can test before uploading. | Medium | CLI tool or npm package that runs the game engine locally. Critical for iteration speed. |
| Sandboxed execution | Server-side sandboxed execution is standard (Halite, CodinGame, Battlecode). Prevents cheating and ensures fairness. | High | V8 isolates or similar. CPU/memory/time limits per turn. No network access, no filesystem. |
| Match result history | All platforms show past match results. Users need to see win/loss records and who they played. | Low | Paginated list with opponent, result, date, link to replay. |
| Fair resource allocation | Equal compute time/memory per agent is table stakes for competitive integrity (all platforms enforce this). | Medium | Deterministic turn limits, equal CPU budgets, timeout = forfeit. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Live spectator mode (real-time)** | Most platforms only offer replays. Live spectating is rare (OpenClaw does it). The PROJECT.md identifies this as a core product feature. MoltGamingLab and OpenClaw prove the "watching AI compete live" concept works. | High | WebSocket-based state streaming. Visual rendering in browser. This is THE differentiator per project vision. |
| **Claude Code / AI-tool integration API** | No existing platform has a programmatic API designed for AI coding assistants. Battlecode/CodinGame assume human-written code. This enables a completely new workflow: AI builds the AI. | Medium | REST/CLI for upload, match search, results, spectate. Machine-readable game specs with JSON Schema. |
| **Spectator-first visualization** | Most platforms have functional but ugly replay viewers. Making matches "visually engaging and understandable without AI knowledge" (per PROJECT.md) is rare. OpenClaw's Tron games work because they're visually immediate. | High | Smooth animations, particle effects, commentary overlays, health bars, score tickers. Think "eSports broadcast" not "debug viewer". |
| **Challenge-based social matches** | Most platforms use automated matchmaking (ELO queue). Direct challenges add social dynamics and rivalry. Terminal and CodinGame lean on leaderboards but lack the "call out" mechanic. | Low | Send challenge to specific user. Accept/decline. This is simpler than matchmaking and creates social engagement. |
| **Machine-readable game specifications** | No platform explicitly designs specs for consumption by AI coding tools. JSON Schema + TypeScript types + rule descriptions in structured format. | Low | Huge multiplier on the Claude Code differentiator. Enables autonomous agent generation. |
| **Spectator commentary / analysis overlays** | Kaggle Game Arena uses expert commentators (Hikaru for chess). Automated analysis overlays (decision trees, heat maps, territory control graphs) during replay/live viewing. | High | Start simple: score overlay, turn counter, resource display. Later: AI-generated commentary. |
| **Multiple game disciplines on one platform** | CodinGame does this well. Most others (Halite, Battlecode, Terminal) are single-game. A platform with Snake + Territory War + future games has more retention. | Medium | Shared infrastructure (accounts, leaderboards, replay system) with pluggable game engines. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| In-browser code editor | CodinGame has one, but it is mediocre compared to VS Code/Cursor/Claude Code. Building a good editor is extremely complex and distracts from core value. Users already have better tools. | Provide excellent specs + starter kits + local runner. Let users use their own tools. |
| Automated matchmaking (MVP) | ELO matchmaking queues are complex (rating decay, queue times, skill brackets). Challenge-based is simpler and more social. | Challenge system for MVP. Matchmaking is a v2+ feature after player base exists. |
| Blockchain / token economy | AI Arena (ArenaX Labs) went crypto-native. It fragments the audience and adds complexity. Daemon Arena's token model distracts from gameplay. | Standard web platform. No tokens, no NFTs, no crypto. |
| Multi-language agent support (MVP) | Battlecode supports Java + Python, Halite supports any language. Multi-language adds massive infrastructure complexity (different runtimes, security boundaries per language). | TypeScript only for MVP. Same runtime as platform = simpler sandboxing, better starter kits. |
| Real-time human + AI hybrid play | Interesting but a completely different product. Screeps is the closest (humans code while game runs). Deferred per PROJECT.md. | Pure AI-vs-AI or AI-vs-environment. Humans are spectators and programmers, not players. |
| Social features (chat, forums, profiles with bios) | Community features are endless scope creep. Discord exists and is better. | Link to Discord. Keep platform focused on compete + spectate. |
| Mobile app | Spectating on mobile is nice but building native apps is a massive effort. | Responsive web app. Mobile spectating via browser is sufficient for MVP. |
| Team-based competitions | Adds complexity (team management, permissions, shared agents). | Solo accounts only for MVP. Teams in v2+ per PROJECT.md. |
| Persistent game worlds | Screeps does this. Massively complex (24/7 server, continuous state, balancing over time). | Discrete matches with clear start/end. Persistent worlds are v5+ per PROJECT.md. |

## Feature Dependencies

```
User Accounts ──> Agent Upload ──> Agent Management (versioning)
                       │
                       v
Game Specifications ──> Game Engine (per discipline)
                       │
                       ├──> Sandboxed Execution ──> Match Running
                       │                              │
                       │                              ├──> Match Results / History
                       │                              │
                       │                              ├──> Replay System ──> Replay Viewer
                       │                              │
                       │                              └──> Live Spectator Mode
                       │
                       └──> Local Dev Runner (uses same engine)

Match Results ──> Leaderboard (ELO calculation)

Agent Upload + Game Specs ──> Programmatic API (Claude Code integration)

Starter Kits ──> depend on Game Specifications being finalized
```

Key ordering constraints:
- Game engine must exist before anything match-related works
- Sandboxed execution must be solid before public launch (security)
- Replay system and live spectator share the same state-serialization infrastructure -- build together
- Leaderboard depends on match results accumulating
- Programmatic API wraps existing upload/match/spectate -- build after those exist

## MVP Recommendation

**Prioritize (Phase 1 - Core Loop):**
1. Game engine for one discipline (Snake -- simpler, agent-vs-environment)
2. Sandboxed execution with TypeScript agents
3. User accounts (GitHub OAuth)
4. Agent upload (file upload)
5. Match replay viewer with speed control
6. Game specification docs (machine-readable)
7. Starter kit for Snake

**Prioritize (Phase 2 - Competition):**
1. Territory War discipline (agent-vs-agent)
2. Challenge system (send/accept challenges)
3. Live spectator mode (WebSocket streaming)
4. Leaderboard per discipline
5. Agent versioning
6. Match history

**Prioritize (Phase 3 - AI Integration):**
1. Programmatic API (upload, query, spectate)
2. CLI tool for local development
3. Enhanced visualization (overlays, animations)
4. Agent performance analytics

**Defer:**
- Automated matchmaking: needs player base first
- In-browser editor: users have better tools
- Multi-language support: TypeScript-only keeps complexity down
- Team features: solo first, teams later
- AI-generated commentary: cool but not essential

## Competitive Landscape Summary

| Platform | Strengths | Weaknesses | What to Learn |
|----------|-----------|------------|---------------|
| **Battlecode** (MIT) | Deep RTS gameplay, strong community, great educational support, 25-year history | Java/Python only, seasonal (January only), academic-focused | Lecture series, starter kits, community building |
| **Screeps** | Persistent world, JavaScript, commercial product (Steam) | Steep learning curve, 24/7 commitment, not spectator-friendly | Persistent world vision (v5+), JS ecosystem |
| **CodinGame** | Multi-game platform, many languages, puzzles + bots, large community | Bot programming is one of many features (diluted focus), visualization is functional not exciting | Multi-discipline platform model, league system |
| **Halite** (Two Sigma) | Clean design, great replay viewer, multi-language, well-documented specs | Discontinued (no longer active), corporate-backed with limited community ownership | Replay viewer UX, specification format, territory control games |
| **Terminal** (C1) | Large scale (2.2M+ matches), tower defense format, prizes, recruiting pipeline | Corporate recruiting tool first / game second, limited game variety | Scale infrastructure, prize model |
| **Lux AI** | Academic prestige (NeurIPS), Kaggle hosting, detailed specs, evolving seasons | Academic-focused, seasonal, steep entry barrier | Specification format, seasonal game evolution |
| **OpenClaw** | Real-time spectating, ELO matchmaking, Python SDK, multiple games | Small community, limited games | Live spectator implementation, ELO system |
| **MoltGamingLab** | LLM-focused (Claude, GPT, etc.), visual games (Snake, Pong, Chess) | LLM agents only, limited programmability | Snake + Pong as game formats, LLM competition angle |

## Sources

- [Battlecode](https://battlecode.org/) - MIT AI programming competition
- [Screeps](https://store.screeps.com/) - MMO strategy sandbox for programmers
- [CodinGame Bot Programming](https://www.codingame.com/multiplayer/bot-programming) - Multi-game bot arena
- [Halite](https://en.wikipedia.org/wiki/Halite_AI_Programming_Competition) - Two Sigma AI challenge (discontinued)
- [Terminal](https://terminal.c1games.com/) - Correlation One AI competition
- [Lux AI Challenge](https://www.lux-ai.org/) - NeurIPS AI competition
- [Coder One](https://www.gocoder.one/) - Annual AI programming tournament
- [aSports overview (DEV.to)](https://dev.to/kamecat/is-asports-the-next-big-thing-ai-agents-are-facing-off-in-competitive-arenas-across-the-internet-380a) - Comprehensive landscape analysis
- [MoltGamingLab](https://moltgaminglab.com/) - LLM agent competition platform
- [Lux AI S2 Specs](https://www.lux-ai.org/specs-s2) - Example of detailed game specifications
