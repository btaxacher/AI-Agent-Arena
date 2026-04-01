# AI Agent Arena

## What This Is

A competitive platform where users create, train, and deploy AI agents that compete against each other across multiple game disciplines. Users don't play directly — they build systems that play for them. The platform provides clear specifications so external tools (especially Claude Code) can autonomously create valid agents.

## Core Value

Users build AI agents that compete in observable, fair games — and watching those agents fight is as compelling as building them.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Agent system with server-side sandboxed execution (TypeScript)
- [ ] Agent upload via UI (file upload + GitHub link)
- [ ] Programmatic API for Claude Code integration (upload, match search, spectate)
- [ ] Snake discipline (agent vs environment)
- [ ] Territory War discipline (agent vs agent, grid-based)
- [ ] Challenge-based match system (send request to another account)
- [ ] Live spectator mode (watch matches in real-time)
- [ ] Replay system (rewatch completed matches, speed control)
- [ ] Clear agent specifications (input/output/rules/limits per discipline)
- [ ] Leaderboards per discipline
- [ ] User accounts and agent management (versioning, performance stats)

### Out of Scope

- API-based agent execution (user runs own server) — deferred to v2+
- Multi-agent per player — deferred to v2+
- Team-based matches — deferred to v2+
- In-browser agent editor — deferred to v2+
- Hybrid human + agent games — deferred to v4+
- Persistent game worlds — deferred to v5+
- Monetization — build community first, monetize later
- Mobile app — web-first

## Context

- Target users are developers and AI enthusiasts who use tools like Claude Code
- Claude Code integration is a key differentiator — agents can be created, uploaded, and managed programmatically
- The platform must define machine-readable specifications per discipline so AI systems can autonomously generate valid agents
- Spectating is a core product feature, not an afterthought — matches should be visually engaging and understandable without AI knowledge
- The system must be designed with evolution in mind: simple games now, complex multi-agent strategy later

### User Journey

1. User reads discipline specification
2. Uses Claude Code to analyze rules, input/output format
3. Claude Code creates agent skeleton
4. User iterates and improves locally
5. Agent is uploaded (UI or programmatic API)
6. User sends challenges to other accounts
7. Watches match live or replays
8. Analyzes results and improves agent

### Long-term Vision

Evolve into a strategy game ("Commander of AI Systems") where players orchestrate multiple specialized agents (resources, military, expansion) — similar to Age of Empires but fully agent-driven.

## Constraints

- **Execution model**: Server-side sandboxed only for MVP — no user-hosted agents
- **Agent language**: TypeScript for MVP (same runtime as platform)
- **Fairness**: Equal compute time/resources per agent, deterministic game rules
- **Observability**: All matches must be watchable and replayable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Server-side execution only (MVP) | Simpler, fairer, better spectator UX | — Pending |
| TypeScript agents | Same runtime as platform, no extra infrastructure | — Pending |
| Challenge-based matches (no matchmaking) | Simpler for MVP, social interaction | — Pending |
| Live + Replay spectator in MVP | Core product feature, not deferrable | — Pending |
| Claude Code API integration | Key differentiator, enables AI-assisted agent creation | — Pending |
| Tech stack open | Research phase will determine best tools | — Pending |

---
*Last updated: 2026-04-01 after initialization*
