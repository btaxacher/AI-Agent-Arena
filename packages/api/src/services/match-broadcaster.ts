import type { SnakeFrame } from "@repo/engine"

export interface MatchBroadcaster {
  publishFrame(matchId: string, frame: SnakeFrame): Promise<void>
  publishMatchEnd(matchId: string, result: MatchEndEvent): Promise<void>
  disconnect(): Promise<void>
}

export interface MatchEndEvent {
  readonly matchId: string
  readonly finalScore: number
  readonly ticksPlayed: number
  readonly terminationReason: string
}

/**
 * Creates a no-op broadcaster for environments without Redis.
 * All publish calls silently succeed.
 */
function createNoopBroadcaster(): MatchBroadcaster {
  return {
    async publishFrame() {},
    async publishMatchEnd() {},
    async disconnect() {},
  }
}

/**
 * Creates a Redis-backed broadcaster for live match frame streaming.
 * Falls back to no-op if Redis is unavailable.
 */
export async function createMatchBroadcaster(
  redisUrl?: string
): Promise<MatchBroadcaster> {
  if (!redisUrl) {
    return createNoopBroadcaster()
  }

  try {
    const { default: Redis } = await import("ioredis")
    const redis = new Redis(redisUrl)

    return {
      async publishFrame(matchId: string, frame: SnakeFrame): Promise<void> {
        await redis.publish(
          `match:${matchId}`,
          JSON.stringify({ type: "frame", data: frame })
        )
      },

      async publishMatchEnd(
        matchId: string,
        result: MatchEndEvent
      ): Promise<void> {
        await redis.publish(
          `match:${matchId}`,
          JSON.stringify({ type: "match_end", data: result })
        )
      },

      async disconnect(): Promise<void> {
        await redis.quit()
      },
    }
  } catch {
    // Redis connection failed -- fall back to no-op
    return createNoopBroadcaster()
  }
}
