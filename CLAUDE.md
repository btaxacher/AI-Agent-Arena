# CLAUDE.md — Global Project Operating System

> Gilt für alle Projekte unter `Projekte/`. Projekt-spezifische Ergänzungen in der jeweiligen Projekt-CLAUDE.md.

## Session-Workflow

### Session-Start

1. `HANDOFF.md` im Projektverzeichnis lesen (falls vorhanden)
2. Projektstatus erfassen, offene TODOs prüfen
3. Memory-Verzeichnis prüfen für Kontext aus früheren Sessions

### Session-Ende

IMMER `HANDOFF.md` im Projektverzeichnis aktualisieren mit:
- Aktueller Stand (1-3 Bullets)
- Letzte Änderungen
- Offene Probleme / Blocker
- Nächste Prioritäten

**Automatische Skill-Verbesserung** (VOR dem HANDOFF):
1. Memory-Health-Check durchführen (MEMORY.md Kapazität prüfen)
2. Promotion-Kandidaten identifizieren (Patterns die 2+ Mal auftraten)
3. Stale Entries bereinigen (veraltete Referenzen entfernen)
4. Bei qualifizierten Patterns: Skill-Extraction vorschlagen

### Memory-System (Dual-Layer)

1. **claude-mem** (Layer 1 — Rohdaten): Persistente Observations, Semantic Search, Timeline
   - Automatisch: Speichert Arbeits-Kontext pro Session
   - `mem-search` für Kontext-Abruf, `timeline` für chronologische Übersicht
2. **self-improving-agent** (Layer 2 — Kuration): Pattern-Extraktion, Promotion, Rules
   - Automatisch: Kuratiert wiederkehrende Patterns aus Memory
   - Promoted bewährte Patterns zu globalen Rules

Regel: claude-mem speichert alles, self-improving-agent kuratiert das Wichtige.

---

## Handoff-System (verpflichtend für alle Projekte)

Jedes Projekt hat eine `HANDOFF.md` im Root-Verzeichnis:

```markdown
# HANDOFF — [Projektname]

## Aktueller Stand
- (Was wurde zuletzt gemacht?)

## Offene Positionen / TODOs
- (Was steht an?)

## Blocker / Risiken
- (Was blockiert Fortschritt?)

## Nächste Prioritäten
1. ...
2. ...

## Letzte Session
- Datum: YYYY-MM-DD
- Zusammenfassung: ...
```

Bei Session-Start IMMER zuerst `HANDOFF.md` lesen. Bei Session-Ende IMMER aktualisieren.
Detaillierte Enforcement-Regeln und Qualitätskriterien in `~/.claude/rules/common/handoff-enforcement.md`.

---

## Workflow & Tools

### GSD (Get Shit Done) — für komplexe Features

- `/gsd:progress` — Projektstatus + nächste Aktion
- `/gsd:plan-phase` — Detaillierten Phasenplan erstellen
- `/gsd:execute-phase` — Plan mit parallelen Waves ausführen
- `/gsd:new-project` — Neues Projekt mit Roadmap initialisieren

### ECC (Everything Claude Code) — für schnelle Tasks

- `/plan` — Implementation planen
- `/code-review` — Code-Review nach Änderungen
- `/build-fix` — Build-Fehler beheben
- `/tdd` — Test-Driven Development

### Playwright — Browser-Automation & Testing

- E2E Tests, Website-Analyse, Screenshots
- Verfügbar via MCP Plugin in allen Projekten

### Google Stitch 2.0 — Design-First (AUTOMATISCH)

- AI-Design-Tool von Google (powered by Gemini 2.5) via MCP global verfügbar
- Automatisch bei allen Frontend/UI-Aufgaben einsetzen (keine Aufforderung nötig)
- Mockups VOR dem Coden generieren, Design-System Extraktion bei neuen Projekten
- Ergänzt frontend-design Skill (Code-Patterns) und magic/21st.dev (Komponenten-Bibliothek)
- Details in `~/.claude/rules/common/stitch-design.md`

### Skills (AUTOMATISCH verwenden — keine Aufforderung nötig)

Skills werden proaktiv eingesetzt sobald der Task zur Skill-Domäne passt. NIEMALS auf User-Aufforderung warten — wenn ein Skill zum aktuellen Kontext passt, sofort nutzen.

**Proaktive Nutzung (Beispiele):**
- `/learn` — am Session-Ende Patterns extrahieren
- `/code-review` + `/simplify` — nach jeder Code-Änderung
- `/build-fix` — wenn Build fehlschlägt
- `/tdd` — bei neuen Features/Bugfixes
- `/verify` — nach Abschluss einer Aufgabe
- `/plan` — bei komplexen Features
- `mem-search` — am Session-Start für Kontext aus früheren Sessions
- Passive Plugins (engineering-skills, finance-skills, etc.) fließen automatisch in Antworten ein

**Anthropic Skills** (Marketplace: `anthropic-agent-skills`):

| Plugin | Auto-Use bei | Inhalt |
|--------|-------------|--------|
| `document-skills` | PDF/DOCX/PPTX/XLSX Aufgaben | Dokument-Erstellung und -Verarbeitung |
| `example-skills` | Design, MCP-Bau, Web-Artefakte | Frontend-Design, Canvas, Brand Guidelines, MCP Builder, Skill Creator, Webapp Testing |
| `claude-api` | Anthropic SDK/API Code | Claude API Dokumentation und Best Practices |

**Community Skills** (Marketplace: `claude-code-skills`):

| Plugin | Auto-Use bei | Inhalt |
|--------|-------------|--------|
| `engineering-skills` | Software-Entwicklung | 24 Skills: Architektur, Frontend, Backend, DevOps, QA, AI/ML, Stripe, TDD |
| `engineering-advanced-skills` | Komplexe technische Aufgaben | 25 Skills: RAG, DB Design, Agent Design, Security Audit, CI/CD, MCP Builder |
| `fullstack-engineer` | Full-Stack Entwicklung | React, Node, DBs, Deployment |
| `aws-architect` | AWS/Cloud Aufgaben | Serverless, IaC, Cost Optimization |
| `product-skills` | Produkt-Arbeit | 12 Skills: PM, UX, Analytics, Landing Pages, SaaS |
| `product-manager` | PRDs, Priorisierung | RICE Scoring, Customer Interviews |
| `pm-skills` | Projektmanagement | 6 Skills: Scrum, Jira, Confluence |
| `scrum-master` | Sprint-Arbeit | Sprint Health, Velocity, Retros |
| `marketing-skills` | Marketing-Aufgaben | 43 Skills: Content, SEO, CRO, Growth, Sales |
| `content-creator` | Content-Erstellung | SEO Content, Brand Voice |
| `demand-gen` | Lead-Generierung | Multi-Channel, Paid Media |
| `finance-skills` | Finanzen | DCF, Budgeting, SaaS Metrics |
| `c-level-skills` | Strategie-Fragen | 28 Skills: CEO, CTO, CFO Advisory |
| `business-growth-skills` | Business Development | Customer Success, Revenue Ops |
| `ra-qm-skills` | Compliance/Regulatorik | ISO, FDA, GDPR, MDR |
| `pw` | Playwright Testing | 9 Skills, 3 Agents, TestRail/BrowserStack |
| `self-improving-agent` | Memory-Optimierung | Auto-Memory Curation, Pattern Extraction |
| `coach` | Friction Detection | Erkennt Korrekturen, Tool-Fehler, Wiederholungen → schlägt Rule-Updates vor |
| `autoresearch-agent` | Optimierungs-Loops | Autonome Experiment-Schleifen |
| `skill-security-auditor` | Sicherheits-Audits | Vulnerability Scanner für AI Skills |
| `google-workspace-cli` | Google Workspace | Gmail, Drive, Sheets, Calendar Automation |
| `claude-mem` | Session-Memory & Wissenssuche | Persistente Memory, AI-Kompression, Semantic Search, Timeline |

### Ressourcen-Verzeichnis

Vor der Suche nach neuen Tools, Skills oder Workflows zuerst hier prüfen:
- **Awesome Claude Code**: https://github.com/hesreallyhim/awesome-claude-code
  - 100+ kuratierte Ressourcen: Tools, Skills, Workflows, CLAUDE.md Templates, Hooks
  - Proaktiv nutzen bei: Tool-Discovery, Workflow-Optimierung, neue Skill-Suche
- **Public APIs**: https://github.com/public-apis/public-apis

### Obsidian — Wissensmanagement

- Für Projekte mit Obsidian Vaults: Vault direkt über Dateisystem bearbeiten
- Markdown-basiert, kompatibel mit Claude Code's Read/Write/Edit Tools
- Bei Wissens-Projekten bevorzugt Obsidian-kompatibles Markdown verwenden

---

## Projekt-Konventionen

- Jedes Projekt hat eine eigene `CLAUDE.md` mit projektspezifischen Details
- Jedes Projekt hat eine `HANDOFF.md` für Session-Kontinuität
- Memory-Verzeichnisse unter `~/.claude/projects/` für projektübergreifendes Lernen
