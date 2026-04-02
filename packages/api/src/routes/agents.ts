import { Hono } from "hono"
import { z } from "zod"
import { eq, and } from "drizzle-orm"
import { requireAuth, type AuthVariables } from "../middleware/auth.js"
import { compileAgentCode } from "../services/agent-compiler.js"
import { fetchAgentFromGitHub } from "../services/agent-github.js"
import type { Context, Next } from "hono"

const MAX_CODE_SIZE = 1024 * 1024 // 1MB

const uploadSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  code: z.string().min(1).max(MAX_CODE_SIZE),
})

const githubLinkSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  repoUrl: z.string().url().regex(/github\.com/, "Must be a GitHub URL"),
  filePath: z.string().min(1),
})

type Env = { Variables: AuthVariables }
type AuthMiddleware = (c: Context<Env>, next: Next) => Promise<Response | void>

export function createAgentRoutes(
  authMiddleware: AuthMiddleware = requireAuth
): Hono<Env> {
  const router = new Hono<Env>()

  // All routes require authentication
  router.use("*", authMiddleware)

  // POST /agents/upload
  router.post("/agents/upload", async (c) => {
    const body = await c.req.json()
    const parsed = uploadSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { success: false, error: parsed.error.errors[0].message },
        400
      )
    }

    const { name, description, code } = parsed.data

    // Check code size
    if (new TextEncoder().encode(code).length > MAX_CODE_SIZE) {
      return c.json(
        { success: false, error: "Agent code exceeds maximum size of 1MB" },
        413
      )
    }

    let compiledCode: string
    try {
      compiledCode = await compileAgentCode(code)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Compilation failed"
      return c.json({ success: false, error: message }, 400)
    }

    const user = c.get("user")

    // Dynamic import to avoid requiring DATABASE_URL at module load
    const { db, agents } = await import("@repo/db")

    const [agent] = await db
      .insert(agents)
      .values({
        userId: user.id,
        name,
        description: description ?? null,
        sourceType: "upload",
        originalCode: code,
        compiledCode,
      })
      .returning()

    return c.json(
      {
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          sourceType: agent.sourceType,
          sourceUrl: agent.sourceUrl,
          version: agent.version,
          isActive: agent.isActive,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
        },
      },
      201
    )
  })

  // POST /agents/github-link
  router.post("/agents/github-link", async (c) => {
    const body = await c.req.json()
    const parsed = githubLinkSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { success: false, error: parsed.error.errors[0].message },
        400
      )
    }

    const { name, description, repoUrl, filePath } = parsed.data

    let code: string
    try {
      code = await fetchAgentFromGitHub(repoUrl, filePath)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch from GitHub"
      return c.json({ success: false, error: message }, 400)
    }

    let compiledCode: string
    try {
      compiledCode = await compileAgentCode(code)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Compilation failed"
      return c.json({ success: false, error: message }, 400)
    }

    const user = c.get("user")
    const { db, agents } = await import("@repo/db")

    const [agent] = await db
      .insert(agents)
      .values({
        userId: user.id,
        name,
        description: description ?? null,
        sourceType: "github",
        sourceUrl: `${repoUrl}/blob/main/${filePath}`,
        originalCode: code,
        compiledCode,
      })
      .returning()

    return c.json(
      {
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          sourceType: agent.sourceType,
          sourceUrl: agent.sourceUrl,
          version: agent.version,
          isActive: agent.isActive,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
        },
      },
      201
    )
  })

  // GET /agents
  router.get("/agents", async (c) => {
    const user = c.get("user")
    const { db, agents } = await import("@repo/db")

    const userAgents = await db
      .select({
        id: agents.id,
        name: agents.name,
        description: agents.description,
        sourceType: agents.sourceType,
        sourceUrl: agents.sourceUrl,
        version: agents.version,
        isActive: agents.isActive,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
      })
      .from(agents)
      .where(and(eq(agents.userId, user.id), eq(agents.isActive, true)))

    return c.json({ success: true, data: userAgents })
  })

  // GET /agents/:id
  router.get("/agents/:id", async (c) => {
    const user = c.get("user")
    const agentId = c.req.param("id")
    const { db, agents } = await import("@repo/db")

    const [agent] = await db
      .select({
        id: agents.id,
        name: agents.name,
        description: agents.description,
        sourceType: agents.sourceType,
        sourceUrl: agents.sourceUrl,
        version: agents.version,
        isActive: agents.isActive,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
      })
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, user.id)))

    if (!agent) {
      return c.json({ success: false, error: "Agent not found" }, 404)
    }

    return c.json({ success: true, data: agent })
  })

  // DELETE /agents/:id (soft delete)
  router.delete("/agents/:id", async (c) => {
    const user = c.get("user")
    const agentId = c.req.param("id")
    const { db, agents } = await import("@repo/db")

    const [agent] = await db
      .update(agents)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(agents.id, agentId), eq(agents.userId, user.id)))
      .returning()

    if (!agent) {
      return c.json({ success: false, error: "Agent not found" }, 404)
    }

    return c.json({ success: true, data: { id: agent.id } })
  })

  return router
}

// Default export with production auth middleware
export const agentRoutes = createAgentRoutes()
