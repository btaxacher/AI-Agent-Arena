import { describe, it, expect } from "vitest"
import { createSnakeEngine } from "../engine.js"
import type { SnakeGameConfig } from "../types.js"
import type { SnakeMove } from "@repo/shared"

function makeConfig(overrides: Partial<SnakeGameConfig> = {}): SnakeGameConfig {
  return {
    gridWidth: 20,
    gridHeight: 20,
    maxTicks: 50,
    initialLength: 3,
    seed: "determinism-test",
    tickRate: 5,
    ...overrides,
  }
}

const MOVES: SnakeMove[] = [
  { direction: "right" },
  { direction: "right" },
  { direction: "down" },
  { direction: "down" },
  { direction: "left" },
  { direction: "right" },
  { direction: "right" },
  { direction: "down" },
  { direction: "right" },
  { direction: "up" },
]

describe("Snake Engine Determinism", () => {
  it("two engines with same seed and same moves produce identical frame sequences", () => {
    const config = makeConfig()
    const engine1 = createSnakeEngine(config)
    const engine2 = createSnakeEngine(config)

    const frames1 = MOVES.map((move) => engine1.applyMove(move))
    const frames2 = MOVES.map((move) => engine2.applyMove(move))

    for (let i = 0; i < frames1.length; i++) {
      expect(frames1[i].state).toEqual(frames2[i].state)
      expect(frames1[i].tick).toBe(frames2[i].tick)
      expect(frames1[i].agentMove).toBe(frames2[i].agentMove)
    }
  })

  it("two engines with different seeds produce different food positions", () => {
    const engine1 = createSnakeEngine(makeConfig({ seed: "seed-alpha" }))
    const engine2 = createSnakeEngine(makeConfig({ seed: "seed-beta" }))

    const state1 = engine1.getState()
    const state2 = engine2.getState()

    // With different seeds, food positions should differ
    // (Theoretically could match by coincidence, but highly unlikely with 20x20 grid)
    const foodSame =
      state1.food.x === state2.food.x && state1.food.y === state2.food.y
    const snakeSame =
      state1.snake[0].x === state2.snake[0].x &&
      state1.snake[0].y === state2.snake[0].y

    // At least one of food or initial position should differ
    // (both use PRNG, so different seeds = different layout)
    expect(foodSame && snakeSame).toBe(false)
  })
})
