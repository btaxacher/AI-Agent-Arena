# Phase 1: Foundation and Agent Pipeline - Research

**Researched:** 2026-04-02
**Domain:** Authentication, Agent Upload/Storage, Sandboxed Execution, Monorepo Setup
**Confidence:** HIGH

## Summary

Phase 1 establishes the project foundation: monorepo structure, database schema, authentication (email/password + GitHub OAuth + API keys), agent upload pipeline (file upload + GitHub linking), and a proof-of-concept for sandboxed agent execution using isolated-vm. This phase has no game logic -- it proves the highest-risk technical component (sandbox with resource limits) and builds the infrastructure every subsequent phase depends on.

The stack is well-researched and locked from project-level research: Turborepo monorepo, Next.js 15 frontend, Hono 4.x API server, Drizzle ORM with PostgreSQL, Better Auth for authentication, and isolated-vm for sandboxed agent execution. All choices have been validated against alternatives and documented in the project's STACK.md. The primary risk area is isolated-vm resource limiting -- the exact API for CPU/memory limits needs hands-on validation, which is explicitly called out as a Phase 1 deliverable.

**Primary recommendation:** Build in this order: (1) monorepo scaffold with shared types, (2) database schema + migrations, (3) auth system with Better Auth, (4) agent upload/storage pipeline, (5) isolated-vm sandbox proof-of-concept with resource limit tests.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up with email and password | Better Auth email/password plugin -- built-in, zero custom code needed |
| AUTH-02 | User session persists across browser refresh | Better Auth uses database sessions by default (not JWT), persists via cookie |
| AUTH-03 | User can generate API keys for programmatic access | Better Auth API Key plugin (@better-auth/api-key) -- create, list, revoke, verify |
| AUTH-04 | User can sign in via GitHub OAuth | Better Auth GitHub social provider -- clientId + clientSecret config |
| AGNT-01 | User can upload agent as TypeScript file | Hono file upload endpoint, esbuild to compile TS to JS, store in filesystem |
| AGNT-02 | User can link agent from GitHub repository | GitHub API to fetch raw file content, validate and store same as uploaded agent |
</phase_requirements>

## Standard Stack

### Core (Phase 1 Specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Turborepo | latest | Monorepo orchestration | Caching, task orchestration, dependency graph. Official Vercel template exists for Next.js + Hono |
| Next.js | 15.x | Frontend app (App Router) | SSR, React Server Components, co-deploys with Vercel |
| Hono | 4.x | REST API server | TypeScript-first, lightweight, runs as standalone Node.js server (not Vercel Functions) |
| Drizzle ORM | 0.38+ | Database access | TypeScript-native schema, SQL-like queries, zero codegen, Drizzle Kit for migrations |
| PostgreSQL | 16+ | Primary database | Relational data (users, agents, sessions), JSONB for metadata |
| Better Auth | 1.x | Authentication | Email/password, GitHub OAuth, API keys, database sessions, Hono integration, Drizzle adapter |
| isolated-vm | 5.x | Agent sandbox | V8 isolate-level isolation, memory/CPU limits, battle-tested by Screeps |
| esbuild | 0.24+ | TypeScript compilation | Compile user-uploaded TS agents to JS for sandbox execution. Fast, single-file bundle |
| Zod | 3.x | Input validation | API request validation, agent metadata validation |
| nanoid | 5.x | ID generation | URL-safe, short IDs for agents, API keys |
| pino | 9.x | Logging | Structured JSON logging for API server |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hono/node-server | latest | Hono Node.js adapter | Running Hono as standalone server (not serverless) |
| postgres (porsager) | 3.x | PostgreSQL driver | Used by Drizzle as underlying driver |
| @better-auth/api-key | latest | API key plugin | AUTH-03 requirement, installed alongside better-auth |
| drizzle-kit | latest | Migration CLI | Generate and run database migrations |
| tsx | 4.x | Dev runner | Run TypeScript files directly in development |
| tsup | 8.x | Build tool | Bundle API server and engine for production |
| Vitest | 3.x | Testing | Unit + integration tests |
| Docker Compose | 3.x | Local dev | PostgreSQL container for local development |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Auth.js/NextAuth | JWT-default, unstable API, complex adapters. Better Auth has database sessions and Hono integration |
| Drizzle | Prisma | Binary engine, code gen step, less SQL control. Drizzle is pure TypeScript |
| isolated-vm | QuickJS WASM | QuickJS has true WASM isolation but isolated-vm is battle-tested by Screeps. Project decision: isolated-vm primary |
| esbuild | tsup/tsc | esbuild is fastest for single-file TS-to-JS compilation. tsup wraps esbuild but adds unnecessary config |
| Turborepo | Nx | Turborepo is simpler, better Vercel integration, sufficient for this project size |

**Installation:**
```bash
# Root monorepo
npm install -D turbo typescript

# packages/api
npm install hono @hono/node-server better-auth @better-auth/api-key zod nanoid pino drizzle-orm postgres

# packages/web
npm install next react react-dom better-auth

# packages/db
npm install drizzle-orm postgres
npm install -D drizzle-kit

# packages/engine (sandbox POC)
npm install isolated-vm esbuild

# packages/shared (types only, no runtime deps)

# Dev dependencies (root)
npm install -D tsx tsup vitest @types/node prettier
```

## Architecture Patterns

### Recommended Project Structure

```
ai-agent-arena/
  apps/
    web/                    # Next.js 15 frontend
      src/
        app/                # App Router pages
          (auth)/           # Auth pages (sign-in, sign-up)
          dashboard/        # User dashboard
          settings/         # Account settings (API keys)
          agents/           # Agent management pages
        lib/
          auth-client.ts    # Better Auth client instance
        components/         # UI components (shadcn/ui)
  packages/
    api/                    # Hono API server
      src/
        routes/
          auth.ts           # Better Auth handler mount
          agents.ts         # Agent CRUD + upload
        middleware/
          auth.ts           # Session/API key verification middleware
        index.ts            # Hono app entry
    engine/                 # Sandbox runner (Phase 1: POC only)
      src/
        sandbox.ts          # isolated-vm wrapper
        compiler.ts         # esbuild TS-to-JS compilation
    db/                     # Database schema and migrations
      src/
        schema/
          users.ts          # User table
          sessions.ts       # Session table (Better Auth)
          accounts.ts       # OAuth accounts (Better Auth)
          agents.ts         # Agent table
          api-keys.ts       # API key table (Better Auth)
        index.ts            # Export all schemas + db client
        migrate.ts          # Migration runner
      drizzle/              # Generated migrations
    shared/                 # Shared TypeScript types
      src/
        types/
          agent.ts          # Agent types (upload, metadata)
          api.ts            # API response envelope
  docker-compose.yml        # PostgreSQL for local dev
  turbo.json                # Turborepo config
  package.json              # Root workspace config
  .env.example              # Environment variable template
```

### Pattern 1: Better Auth with Hono + Drizzle

**What:** Mount Better Auth as a Hono route handler, using Drizzle as the database adapter.
**When to use:** All authentication flows (sign-up, sign-in, session management, API keys).

```typescript
// packages/api/src/auth.ts
import { betterAuth } from "better-auth"
import { apiKey } from "@better-auth/api-key"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@repo/db"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  plugins: [apiKey()],
  trustedOrigins: [process.env.FRONTEND_URL!],
})

// packages/api/src/routes/auth.ts
import { Hono } from "hono"
import { auth } from "../auth"

const authRoutes = new Hono()

authRoutes.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw)
})

export { authRoutes }
```

### Pattern 2: Agent Upload Pipeline

**What:** Multi-stage validation pipeline for agent TypeScript files.
**When to use:** AGNT-01 (file upload) and AGNT-02 (GitHub link).

```typescript
// Upload pipeline stages:
// 1. Receive file (max 1MB) or fetch from GitHub URL
// 2. Validate TypeScript syntax (esbuild parse)
// 3. Compile TS to JS bundle (esbuild, single file, no external imports)
// 4. Validate exports correct function signature
// 5. Store original TS + compiled JS
// 6. Create agent record in database

import * as esbuild from "esbuild"

async function compileAgentCode(tsCode: string): Promise<string> {
  const result = await esbuild.build({
    stdin: {
      contents: tsCode,
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    platform: "neutral", // No Node.js APIs
  })
  return result.outputFiles[0].text
}
```

### Pattern 3: Isolated-VM Sandbox Wrapper

**What:** Create a reusable sandbox that executes compiled JS with strict resource limits.
**When to use:** Executing any user-uploaded agent code.

```typescript
// packages/engine/src/sandbox.ts
import ivm from "isolated-vm"

interface SandboxOptions {
  memoryLimitMb: number  // e.g., 128
  timeoutMs: number      // e.g., 50
}

interface SandboxResult {
  result: unknown
  cpuTimeNs: bigint
  wallTimeNs: bigint
}

async function executeInSandbox(
  compiledJs: string,
  gameState: unknown,
  options: SandboxOptions
): Promise<SandboxResult> {
  const isolate = new ivm.Isolate({ memoryLimit: options.memoryLimitMb })
  try {
    const context = await isolate.createContext()
    const jail = context.global

    // Inject game state as frozen global
    await jail.set("__gameState__", new ivm.ExternalCopy(gameState).copyInto())

    // Compile and run agent code
    const script = await isolate.compileScript(compiledJs)
    await script.run(context, { timeout: options.timeoutMs })

    // Call the agent's move function
    const moveScript = await isolate.compileScript("move(__gameState__)")
    const result = await moveScript.run(context, { timeout: options.timeoutMs })

    return {
      result: result,
      cpuTimeNs: isolate.cpuTime,
      wallTimeNs: isolate.wallTime,
    }
  } finally {
    isolate.dispose()
  }
}
```

### Pattern 4: GitHub Repository Agent Linking

**What:** Fetch agent source code from a GitHub repository URL.
**When to use:** AGNT-02 -- user provides a GitHub repo URL containing an agent file.

```typescript
// Fetch raw file content from GitHub
// URL format: https://github.com/{owner}/{repo}/blob/{branch}/{path}
// Convert to raw: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
// Or use GitHub API: GET /repos/{owner}/{repo}/contents/{path}

async function fetchAgentFromGitHub(repoUrl: string): Promise<string> {
  // Parse URL to extract owner, repo, branch, path
  // Fetch raw content via GitHub API (no auth needed for public repos)
  // For private repos: user must provide a GitHub token
  // Apply same validation pipeline as file upload
  const response = await fetch(rawUrl)
  if (!response.ok) throw new Error("Failed to fetch agent from GitHub")
  const code = await response.text()
  // Max size check (1MB)
  if (code.length > 1_000_000) throw new Error("Agent file too large")
  return code
}
```

### Pattern 5: API Response Envelope

**What:** Consistent response format across all API endpoints.
**When to use:** Every Hono route handler.

```typescript
// packages/shared/src/types/api.ts
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Usage in Hono
app.post("/api/agents/upload", async (c) => {
  try {
    const agent = await uploadAgent(/* ... */)
    return c.json<ApiResponse<Agent>>({ success: true, data: agent })
  } catch (err) {
    return c.json<ApiResponse<never>>(
      { success: false, error: getErrorMessage(err) },
      400
    )
  }
})
```

### Anti-Patterns to Avoid

- **Running agent code in the API process:** Always use isolated-vm in a separate execution context. Never `eval()` or `new Function()` with user code.
- **JWT sessions:** Better Auth defaults to database sessions. Do not switch to JWT -- database sessions are revocable and more secure for a platform that handles code uploads.
- **Shared database connection in sandbox:** The isolated-vm context must have zero access to the host process's database, environment variables, or filesystem.
- **Monolithic single-package:** Even for Phase 1, maintain the monorepo structure. Refactoring from a single package later is painful.
- **Skipping the compilation step:** Always compile TS to JS via esbuild before storing. Never run raw TypeScript in the sandbox.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom auth system | Better Auth | Session management, CSRF protection, OAuth flows, password hashing are security-critical. Better Auth handles all of this with database sessions |
| API key management | Custom key generation/storage | Better Auth API Key plugin | Secure hashing, rate limiting, expiration, revocation built-in |
| TypeScript compilation | Custom TS parser/compiler | esbuild | Sub-millisecond compilation, handles all TS syntax, produces clean JS |
| Database migrations | Manual SQL scripts | Drizzle Kit | Schema diffing, migration generation, rollback support |
| Input validation | Manual if/else checks | Zod schemas | Composable, type-inferred, detailed error messages |
| Monorepo task orchestration | npm scripts with manual ordering | Turborepo | Dependency-aware task execution, caching, parallel builds |
| ID generation | Math.random() or UUID | nanoid | URL-safe, short, collision-resistant, fast |

**Key insight:** Phase 1 is infrastructure -- nearly every component has a battle-tested library. The only custom code should be the agent upload pipeline orchestration and the sandbox wrapper.

## Common Pitfalls

### Pitfall 1: isolated-vm Memory Limit is Approximate

**What goes wrong:** Setting `memoryLimit: 128` does not hard-cap at 128MB. The official docs state: "this is more of a guideline instead of a strict limit. A determined attacker could use 2-3 times this limit before their script is terminated."
**Why it happens:** V8's garbage collector and heap management do not enforce hard limits at the isolate level.
**How to avoid:** Set the memory limit conservatively (e.g., 64MB if you want a ~128MB effective cap). Monitor actual usage via `isolate.getHeapStatistics()`. Add a secondary check: poll heap stats and dispose the isolate if it exceeds the real limit. Wrap the engine process in a Docker container with a hard memory limit as defense in depth.
**Warning signs:** Tests that allocate large arrays in the sandbox succeed beyond the configured limit.

### Pitfall 2: Better Auth Database Schema Conflicts with Custom Tables

**What goes wrong:** Better Auth auto-generates tables for users, sessions, accounts, and API keys. If you define your own Drizzle schema for these tables, migrations conflict.
**Why it happens:** Better Auth expects to own certain table schemas. Drizzle Kit generates migrations based on your schema files. If both try to manage the same tables, you get duplicate or conflicting migrations.
**How to avoid:** Run `npx auth@latest generate` first to get Better Auth's schema. Use that as the base for your Drizzle schema. Add custom columns via Better Auth's schema extension options rather than modifying the generated schema directly. Keep Better Auth tables and custom application tables (agents, etc.) in separate schema files.
**Warning signs:** Migration errors about tables already existing or column type mismatches.

### Pitfall 3: isolated-vm Native Module Build Failures

**What goes wrong:** `npm install isolated-vm` fails on certain platforms because it requires compiling a native C++ addon (V8 bindings).
**Why it happens:** Needs Python, C++ compiler, and node-gyp. Windows requires Visual Studio Build Tools. Some Node.js versions have compatibility issues.
**How to avoid:** Use Node.js 22 LTS (known compatible). On Windows, install Visual Studio Build Tools with "Desktop development with C++" workload. Pin the isolated-vm version in package.json. Test the build in CI early. If persistent issues, the `@aspect-build/aspect-cli` QuickJS WASM package is the fallback (no native compilation needed).
**Warning signs:** `node-gyp rebuild` errors during npm install.

### Pitfall 4: Agent Upload Without Size Limits

**What goes wrong:** Users upload massive files (10MB+ TypeScript files) that overwhelm the compilation step or storage.
**Why it happens:** No file size validation on the upload endpoint.
**How to avoid:** Enforce a 1MB limit on uploaded agent files at the Hono middleware level. Validate file size before reading the body. Return a clear error message with the size limit.
**Warning signs:** Slow upload responses, high memory usage during compilation.

### Pitfall 5: GitHub API Rate Limiting on Agent Linking

**What goes wrong:** Fetching agent code from GitHub raw URLs or API without authentication hits rate limits (60 requests/hour for unauthenticated).
**Why it happens:** Multiple users linking agents from GitHub exhaust the unauthenticated rate limit.
**How to avoid:** Use the GitHub API with the user's OAuth token (they already authenticated via GitHub). Cache fetched agent code. For public repos, use `raw.githubusercontent.com` which has higher limits than the API. Implement retry with backoff.
**Warning signs:** 403 responses from GitHub API with "rate limit exceeded" message.

## Code Examples

### Database Schema (Drizzle)

```typescript
// packages/db/src/schema/agents.ts
import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core"
import { nanoid } from "nanoid"

export const agents = pgTable("agents", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull(), // references Better Auth user table
  name: text("name").notNull(),
  description: text("description"),
  sourceType: text("source_type").notNull(), // "upload" | "github"
  sourceUrl: text("source_url"), // GitHub URL if linked
  originalCode: text("original_code").notNull(), // TypeScript source
  compiledCode: text("compiled_code").notNull(), // Compiled JS
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
```

### Hono App Structure

```typescript
// packages/api/src/index.ts
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { authRoutes } from "./routes/auth"
import { agentRoutes } from "./routes/agents"

const app = new Hono()

app.use("*", logger())
app.use("*", cors({ origin: process.env.FRONTEND_URL!, credentials: true }))

app.route("/", authRoutes)
app.route("/api", agentRoutes)

export default app
```

### Better Auth Client (Next.js)

```typescript
// apps/web/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react"
import { apiKeyClient } from "@better-auth/api-key/client"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  plugins: [apiKeyClient()],
})

// Usage in a component
// const { data: session } = authClient.useSession()
// await authClient.signIn.email({ email, password })
// await authClient.signIn.social({ provider: "github" })
// await authClient.apiKey.create({ name: "my-key" })
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lucia Auth | Better Auth | 2025 (Lucia maintenance mode) | Better Auth is the TypeScript-first successor with plugin architecture |
| Prisma | Drizzle | 2024-2025 adoption wave | Zero codegen, SQL-close, faster startup |
| vm2 sandbox | isolated-vm / QuickJS WASM | 2023 (vm2 deprecated, CVEs) | vm2 must never be used; isolated-vm or WASM isolation required |
| Express | Hono | 2024-2025 | TypeScript-first, 3-5x faster, better middleware |
| JWT sessions | Database sessions | Ongoing shift | Database sessions are revocable, no token size issues, Better Auth default |
| npm workspaces | Turborepo | 2023+ | Caching, parallel execution, dependency-aware builds |

**Deprecated/outdated:**
- **vm2**: Deprecated, critical CVE-2026-22709. Do NOT use.
- **Lucia Auth**: Maintenance mode, no new features. Use Better Auth instead.
- **NextAuth v4/Auth.js v5**: Unstable API, JWT default. Better Auth is more stable for this use case.

## Open Questions

1. **isolated-vm on Windows (development environment)**
   - What we know: The project is developed on Windows 11. isolated-vm requires native C++ compilation via node-gyp.
   - What's unclear: Whether isolated-vm builds cleanly on Windows with Node.js 22 LTS. GitHub issues report intermittent build problems.
   - Recommendation: Test early in Phase 1 Wave 0. If it fails, QuickJS WASM (`@sebastianwessel/quickjs`) is the fallback -- it requires no native compilation.

2. **Better Auth + Drizzle adapter maturity**
   - What we know: Better Auth supports Drizzle via `drizzleAdapter(db, { provider: "pg" })`. The library is newer (1.x).
   - What's unclear: Edge cases with schema generation, migration conflicts, and custom column extensions.
   - Recommendation: Run `npx auth@latest generate` early, inspect the generated schema, and integrate it into the Drizzle schema files before writing custom tables. Test auth flows end-to-end in Wave 1.

3. **Agent file storage strategy**
   - What we know: For Phase 1, filesystem storage is sufficient. At scale, S3 or equivalent is needed.
   - What's unclear: Whether to store agent code in the database (simpler) or filesystem (scalable).
   - Recommendation: Store in PostgreSQL `text` columns for Phase 1 (simplicity, single source of truth, no file sync issues). Migrate to S3 in a later phase when agent count justifies it.

4. **esbuild platform:"neutral" behavior with agent code**
   - What we know: esbuild with `platform: "neutral"` strips Node.js and browser built-ins.
   - What's unclear: Whether all edge cases of TypeScript agent code compile correctly with this setting.
   - Recommendation: Validate with a test suite of agent code samples (valid and invalid) in Wave 0.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | none -- Wave 0 must create `vitest.config.ts` at root |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx turbo test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Sign up with email/password | integration | `npx vitest run packages/api/src/__tests__/auth-email.test.ts -t "sign up"` | No -- Wave 0 |
| AUTH-02 | Session persists across refresh | integration | `npx vitest run packages/api/src/__tests__/auth-session.test.ts -t "session persist"` | No -- Wave 0 |
| AUTH-03 | Generate API key | integration | `npx vitest run packages/api/src/__tests__/api-keys.test.ts -t "create key"` | No -- Wave 0 |
| AUTH-04 | Sign in via GitHub OAuth | integration | `npx vitest run packages/api/src/__tests__/auth-github.test.ts -t "github oauth"` | No -- Wave 0 |
| AGNT-01 | Upload TypeScript agent | integration | `npx vitest run packages/api/src/__tests__/agent-upload.test.ts -t "upload agent"` | No -- Wave 0 |
| AGNT-02 | Link agent from GitHub URL | integration | `npx vitest run packages/api/src/__tests__/agent-github.test.ts -t "link github"` | No -- Wave 0 |
| SANDBOX | Execute agent in isolated-vm with limits | unit | `npx vitest run packages/engine/src/__tests__/sandbox.test.ts` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --changed`
- **Per wave merge:** `npx turbo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` -- root Vitest config with workspace support
- [ ] `packages/api/vitest.config.ts` -- API package test config
- [ ] `packages/engine/vitest.config.ts` -- Engine package test config
- [ ] `packages/api/src/__tests__/setup.ts` -- Test database setup/teardown (use test PostgreSQL or in-memory)
- [ ] `docker-compose.test.yml` -- Test PostgreSQL container
- [ ] Framework install: `npm install -D vitest @vitest/coverage-v8`

## Sources

### Primary (HIGH confidence)
- [isolated-vm GitHub](https://github.com/laverdet/isolated-vm) -- API documentation for memory limits, timeout, cpuTime, wallTime
- [Better Auth official docs](https://better-auth.com/docs/introduction) -- Installation, Drizzle adapter, email/password, GitHub OAuth
- [Better Auth API Key plugin](https://better-auth.com/docs/plugins/api-key) -- API key create, verify, list, revoke
- [Better Auth GitHub provider](https://better-auth.com/docs/authentication/github) -- OAuth setup with clientId/clientSecret
- [Hono + Better Auth example](https://hono.dev/examples/better-auth) -- Handler mount pattern for Hono
- [Drizzle ORM docs](https://orm.drizzle.team/) -- Schema definitions, migrations, PostgreSQL driver
- [Turborepo + Hono template](https://vercel.com/templates/monorepos/turborepo-with-hono) -- Official Vercel monorepo template

### Secondary (MEDIUM confidence)
- [esbuild API](https://esbuild.github.io/api/) -- TS-to-JS compilation, platform: "neutral", stdin API
- [Screeps isolated-vm usage](https://docs.screeps.com/architecture.html) -- Production validation of isolated-vm at scale
- [Better Auth vs Lucia 2026](https://trybuildpilot.com/625-better-auth-vs-lucia-vs-nextauth-2026) -- Auth library comparison
- [isolated-vm npm](https://www.npmjs.com/package/isolated-vm) -- Latest version, compatibility notes

### Tertiary (LOW confidence)
- [sebastianwessel/quickjs](https://github.com/sebastianwessel/quickjs) -- QuickJS WASM fallback if isolated-vm fails on Windows

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries are locked decisions from project research, well-documented with official sources
- Architecture: HIGH -- Monorepo structure follows official Turborepo templates, Better Auth + Hono integration is officially documented
- Pitfalls: HIGH -- isolated-vm memory limit approximation is documented in official README, Better Auth schema conflicts are a known integration concern
- Sandbox POC: MEDIUM -- isolated-vm API is documented but hands-on validation needed for exact resource limit behavior

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable stack, 30-day validity)
