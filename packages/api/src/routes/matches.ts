import { Hono } from "hono"
import { z } from "zod"
import { eq, and, desc } from "drizzle-orm"
import { nanoid } from "nanoid"
import type { Context, Next } from "hono"
import type { AuthVariables } from "../middleware/auth.js"
import { requireAuth } from "../middleware/auth.js"
import { runMatch } from "../services/match-runner.js"
import { createMatchBroadcaster } from "../services/match-broadcaster.js"
import { DEFAULT_SNAKE_CONFIG } from "@repo/engine"

type Env = { Variables: AuthVariables }
type AuthMiddleware = (c: Context<Env>, next: Next) => Promise<Response | void>

const startMatchSchema = z.object({
  agentId: z.string().min(1),
  discipline: z.enum(["snake"]).default("snake"),
  config: z
    .object({
      gridWidth: z.number().int().min(5).max(50).optional(),
      gridHeight: z.number().int().min(5).max(50).optional(),
      maxTicks: z.number().int().min(10).max(5000).optional(),
      initialLength: z.number().int().min(1).max(10).optional(),
      tickRate: z.number().int().min(1).max(60).optional(),
    })
    .optional(),
})

export function createMatchRoutes(
  authMiddleware: AuthMiddleware = requireAuth
): Hono<Env> {
  const router = new Hono<Env>()

  // All routes require authentication
  router.use("*", authMiddleware)

  // POST /matches -- start a new match
  router.post("/matches", async (c) => {
    const body = await c.req.json()
    const parsed = startMatchSchema.safeParse(body)

    if (!parsed.success) {
      return c.json(
        { success: false, error: parsed.error.errors[0].message },
        400
      )
    }

    const { agentId, config: userConfig } = parsed.data
    const user = c.get("user")

    const { db, agents, matches } = await import("@repo/db")

    // Verify agent belongs to user
    const [agent] = await db
      .select({
        id: agents.id,
        compiledCode: agents.compiledCode,
      })
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, user.id)))

    if (!agent) {
      return c.json(
        { success: false, error: "Agent not found" },
        404
      )
    }

    const seed = nanoid()
    const matchConfig = {
      ...DEFAULT_SNAKE_CONFIG,
      ...userConfig,
      seed,
    }

    // Create match record
    const [match] = await db
      .insert(matches)
      .values({
        userId: user.id,
        agentId,
        discipline: "snake",
        seed,
        config: matchConfig,
        status: "queued",
      })
      .returning()

    // Update to running
    await db
      .update(matches)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(matches.id, match.id))

    try {
      const broadcaster = await createMatchBroadcaster(
        process.env.REDIS_URL
      )

      const result = await runMatch(agent.compiledCode, matchConfig, {
        matchId: match.id,
        broadcaster,
      })

      // Update match with results
      await db
        .update(matches)
        .set({
          status: "completed",
          score: result.finalScore,
          ticksPlayed: result.ticksPlayed,
          terminationReason: result.terminationReason,
          frames: result.frames as unknown as Record<string, unknown>,
          completedAt: new Date(),
        })
        .where(eq(matches.id, match.id))

      await broadcaster.disconnect()

      return c.json(
        {
          success: true,
          data: {
            id: match.id,
            userId: user.id,
            agentId,
            discipline: "snake",
            seed,
            status: "completed",
            score: result.finalScore,
            ticksPlayed: result.ticksPlayed,
            terminationReason: result.terminationReason,
            createdAt: match.createdAt,
            completedAt: new Date(),
          },
        },
        201
      )
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Match execution failed"

      await db
        .update(matches)
        .set({
          status: "error",
          errorMessage: message,
          completedAt: new Date(),
        })
        .where(eq(matches.id, match.id))

      return c.json({ success: false, error: message }, 500)
    }
  })

  // GET /matches/:id -- get full match with frames (for replay)
  router.get("/matches/:id", async (c) => {
    const user = c.get("user")
    const matchId = c.req.param("id")

    const { db, matches } = await import("@repo/db")

    const [match] = await db
      .select()
      .from(matches)
      .where(and(eq(matches.id, matchId), eq(matches.userId, user.id)))

    if (!match) {
      return c.json({ success: false, error: "Match not found" }, 404)
    }

    return c.json({ success: true, data: match })
  })

  // GET /matches -- list user's matches (without frames)
  router.get("/matches", async (c) => {
    const user = c.get("user")

    const { db, matches } = await import("@repo/db")

    const userMatches = await db
      .select({
        id: matches.id,
        userId: matches.userId,
        agentId: matches.agentId,
        discipline: matches.discipline,
        seed: matches.seed,
        status: matches.status,
        score: matches.score,
        ticksPlayed: matches.ticksPlayed,
        terminationReason: matches.terminationReason,
        createdAt: matches.createdAt,
        completedAt: matches.completedAt,
      })
      .from(matches)
      .where(eq(matches.userId, user.id))
      .orderBy(desc(matches.createdAt))

    return c.json({ success: true, data: userMatches })
  })

  return router
}

// Default export with production auth middleware
export const matchRoutes = createMatchRoutes()
