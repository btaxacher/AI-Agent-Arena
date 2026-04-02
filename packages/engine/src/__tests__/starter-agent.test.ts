import { describe, it, expect } from "vitest"
import { compileTypeScript } from "../compiler.js"
import { MatchSandbox } from "../match-sandbox.js"
import { SNAKE_STARTER_AGENT_SOURCE } from "@repo/shared"

// Append export so esbuild preserves the move function (matches real user upload flow)
const STARTER_WITH_EXPORT = SNAKE_STARTER_AGENT_SOURCE + "\nexport { move }"

describe("Starter Agent in MatchSandbox", () => {
  it("starter agent source compiles via esbuild and runs in sandbox", async () => {
    const compiled = await compileTypeScript(STARTER_WITH_EXPORT)
    expect(compiled).toBeTruthy()

    const sandbox = new MatchSandbox(compiled, {
      memoryLimitMb: 64,
      timeoutMs: 1000,
    })

    try {
      await sandbox.init()

      const state = {
        tick: 0,
        snake: [
          { x: 10, y: 10 },
          { x: 9, y: 10 },
          { x: 8, y: 10 },
        ],
        food: { x: 15, y: 10 },
        direction: "right",
        score: 0,
        alive: true,
        gridWidth: 20,
        gridHeight: 20,
      }

      const result = await sandbox.callMove(state)
      expect(result.result).toBeTruthy()
    } finally {
      sandbox.dispose()
    }
  })

  it("starter agent returns valid SnakeMove with direction and reasoning", async () => {
    const compiled = await compileTypeScript(STARTER_WITH_EXPORT)

    const sandbox = new MatchSandbox(compiled, {
      memoryLimitMb: 64,
      timeoutMs: 1000,
    })

    try {
      await sandbox.init()

      const state = {
        tick: 0,
        snake: [
          { x: 10, y: 10 },
          { x: 9, y: 10 },
          { x: 8, y: 10 },
        ],
        food: { x: 5, y: 3 },
        direction: "right",
        score: 0,
        alive: true,
        gridWidth: 20,
        gridHeight: 20,
      }

      const result = await sandbox.callMove(state)
      const move = result.result as { direction: string; reasoning?: string }

      expect(["up", "down", "left", "right"]).toContain(move.direction)
      expect(move.reasoning).toBeTruthy()
      expect(typeof move.reasoning).toBe("string")
    } finally {
      sandbox.dispose()
    }
  })
})
