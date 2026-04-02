import {
  createSnakeEngine,
  MatchSandbox,
  type SnakeGameConfig,
  type SnakeFrame,
} from "@repo/engine"
import { snakeMoveSchema } from "@repo/shared"
import type { TerminationReason } from "@repo/shared"
import { nanoid } from "nanoid"
import type { MatchBroadcaster } from "./match-broadcaster.js"

export interface MatchResult {
  readonly matchId: string
  readonly frames: ReadonlyArray<SnakeFrame>
  readonly finalScore: number
  readonly ticksPlayed: number
  readonly terminationReason: TerminationReason
}

export interface RunMatchOptions {
  readonly matchId?: string
  readonly broadcaster?: MatchBroadcaster
}

/**
 * Executes a full Snake match: creates engine, runs agent in sandbox for each
 * tick, records frames, and returns the complete result.
 */
export async function runMatch(
  agentCompiledCode: string,
  config: SnakeGameConfig,
  options?: RunMatchOptions
): Promise<MatchResult> {
  const matchId = options?.matchId ?? nanoid()
  const broadcaster = options?.broadcaster
  const frames: SnakeFrame[] = []

  const engine = createSnakeEngine(config)
  const sandbox = new MatchSandbox(agentCompiledCode, {
    memoryLimitMb: 64,
    timeoutMs: 1000,
  })

  try {
    await sandbox.init()

    while (engine.isAlive() && engine.getTick() < config.maxTicks) {
      const state = engine.getState()

      let moveResult: unknown
      try {
        const sandboxResult = await sandbox.callMove(state)
        moveResult = sandboxResult.result
      } catch {
        // Agent crashed or timed out
        return {
          matchId,
          frames,
          finalScore: engine.getScore(),
          ticksPlayed: engine.getTick(),
          terminationReason: "crash",
        }
      }

      // Validate the move with Zod schema
      const parsed = snakeMoveSchema.safeParse(moveResult)
      if (!parsed.success) {
        // Invalid move format -- treat as crash
        return {
          matchId,
          frames,
          finalScore: engine.getScore(),
          ticksPlayed: engine.getTick(),
          terminationReason: "crash",
        }
      }

      const frame = engine.applyMove(parsed.data)
      frames.push(frame)

      if (broadcaster) {
        await broadcaster.publishFrame(matchId, frame)
      }
    }

    const terminationReason: TerminationReason =
      engine.getTerminationReason() === "death"
        ? "death"
        : engine.getTerminationReason() === "completed"
          ? "completed"
          : "completed"

    const result: MatchResult = {
      matchId,
      frames,
      finalScore: engine.getScore(),
      ticksPlayed: engine.getTick(),
      terminationReason,
    }

    if (broadcaster) {
      await broadcaster.publishMatchEnd(matchId, {
        matchId,
        finalScore: result.finalScore,
        ticksPlayed: result.ticksPlayed,
        terminationReason: result.terminationReason,
      })
    }

    return result
  } finally {
    sandbox.dispose()
  }
}
