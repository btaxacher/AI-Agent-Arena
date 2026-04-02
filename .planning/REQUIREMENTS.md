# Requirements: AI Agent Arena

**Defined:** 2026-04-01
**Core Value:** Users build AI agents that compete in observable, fair games — and watching those agents fight is as compelling as building them.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **AUTH-03**: User can generate API keys for programmatic access (Claude Code)
- [ ] **AUTH-04**: User can sign in via GitHub OAuth

### Agent Management

- [ ] **AGNT-01**: User can upload agent as TypeScript file
- [ ] **AGNT-02**: User can link agent from GitHub repository
- [ ] **AGNT-03**: User can manage multiple versions of an agent
- [ ] **AGNT-04**: User can view win/loss statistics per agent

### Game Engine

- [ ] **GAME-01**: Snake discipline — agent controls snake, collects points, survives
- [ ] **GAME-02**: Territory War discipline — two agents compete for area control on grid
- [ ] **GAME-03**: Machine-readable specs (TypeScript interfaces + JSON Schema) per discipline
- [ ] **GAME-04**: House bots as pre-built opponents for testing

### Spectator

- [ ] **SPEC-01**: User can watch running matches live via WebSocket
- [ ] **SPEC-02**: User can watch completed matches as replay
- [ ] **SPEC-03**: Decision overlay shows high-level agent decisions during spectating

### Match System

- [ ] **MTCH-01**: User can challenge another account to a match
- [ ] **MTCH-02**: User can view match history
- [ ] **MTCH-03**: Match results show score, duration, and winner

### Rankings

- [ ] **RANK-01**: Leaderboard per discipline based on ELO/wins
- [ ] **RANK-02**: Public agent profile page with stats

### API/Integration

- [ ] **INTG-01**: REST API for agent upload, match search, results (Claude Code integration)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Spectator Enhancements

- **SPEC-04**: Speed control for replay playback (0.5x to 4x)
- **SPEC-05**: Perspective switching between agents

### Competitive

- **COMP-01**: Automatic matchmaking queue
- **COMP-02**: Season system with time-limited competition phases
- **COMP-03**: Tournament brackets

### Agent Creation

- **ACRT-01**: In-browser agent editor
- **ACRT-02**: Agent debugging/testing sandbox on platform

### Advanced

- **ADV-01**: Multi-agent per player (multiple agents in one match)
- **ADV-02**: Team-based matches
- **ADV-03**: Additional disciplines

## Out of Scope

| Feature | Reason |
|---------|--------|
| API-based agent execution (user hosts agent server) | High complexity, latency issues, unfair advantages — deferred to v2+ |
| Mobile app | Web-first, mobile later |
| Monetization / payments | Build community first, monetize later |
| Hybrid human + agent games | Requires mature agent system — deferred to v4+ |
| Persistent game worlds | Requires multi-agent coordination — deferred to v5+ |
| Real-time chat | Not core to competitive agent experience |
| Video streaming of matches | Canvas rendering is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AGNT-01 | Phase 1 | Pending |
| AGNT-02 | Phase 1 | Pending |
| AGNT-03 | Phase 3 | Pending |
| AGNT-04 | Phase 3 | Pending |
| GAME-01 | Phase 2 | Pending |
| GAME-02 | Phase 4 | Pending |
| GAME-03 | Phase 2 | Pending |
| GAME-04 | Phase 3 | Pending |
| SPEC-01 | Phase 2 | Pending |
| SPEC-02 | Phase 2 | Pending |
| SPEC-03 | Phase 2 | Pending |
| MTCH-01 | Phase 3 | Pending |
| MTCH-02 | Phase 3 | Pending |
| MTCH-03 | Phase 3 | Pending |
| RANK-01 | Phase 3 | Pending |
| RANK-02 | Phase 3 | Pending |
| INTG-01 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 after roadmap creation*
