import { describe, it, expect } from "vitest"
import { createSnakeEngine } from "../engine.js"
import type { SnakeGameConfig } from "../types.js"

function makeConfig(overrides: Partial<SnakeGameConfig> = {}): SnakeGameConfig {
  return {
    gridWidth: 20,
    gridHeight: 20,
    maxTicks: 500,
    initialLength: 3,
    seed: "test-seed",
    tickRate: 5,
    ...overrides,
  }
}

describe("Snake Engine", () => {
  it("initializes with snake at correct position and length", () => {
    const engine = createSnakeEngine(makeConfig())
    const state = engine.getState()

    expect(state.snake).toHaveLength(3)
    expect(state.alive).toBe(true)
    expect(state.score).toBe(0)
    expect(state.tick).toBe(0)
    expect(state.direction).toBeDefined()
    expect(state.gridWidth).toBe(20)
    expect(state.gridHeight).toBe(20)
  })

  it("moves snake in the correct direction", () => {
    const engine = createSnakeEngine(makeConfig())
    const stateBefore = engine.getState()
    const headBefore = stateBefore.snake[0]

    const frame = engine.applyMove({ direction: "right" })

    expect(frame.state.snake[0].x).toBe(headBefore.x + 1)
    expect(frame.state.snake[0].y).toBe(headBefore.y)
    expect(frame.tick).toBe(1)
  })

  it("grows when it eats food and increments score", () => {
    const engine = createSnakeEngine(makeConfig({ gridWidth: 10, gridHeight: 10 }))
    const state = engine.getState()
    const food = state.food
    const head = state.snake[0]
    const initialLength = state.snake.length

    // Determine direction to move toward food
    let movesMade = 0
    const maxMoves = 100
    let ate = false

    while (movesMade < maxMoves && !ate) {
      const currentState = engine.getState()
      if (!currentState.alive) break
      const currentHead = currentState.snake[0]
      const currentFood = currentState.food

      let dir: "up" | "down" | "left" | "right" = "right"
      const dx = currentFood.x - currentHead.x
      const dy = currentFood.y - currentHead.y

      if (dx > 0) dir = "right"
      else if (dx < 0) dir = "left"
      else if (dy > 0) dir = "down"
      else if (dy < 0) dir = "up"

      const prevScore = currentState.score
      engine.applyMove({ direction: dir })
      movesMade++

      if (engine.getScore() > prevScore) {
        ate = true
      }
    }

    expect(ate).toBe(true)
    expect(engine.getScore()).toBeGreaterThan(0)
    expect(engine.getState().snake.length).toBeGreaterThan(initialLength)
  })

  it("dies on wall collision", () => {
    // Place snake near right wall
    const engine = createSnakeEngine(makeConfig({ gridWidth: 10, gridHeight: 10 }))

    // Move right until hitting wall
    let alive = true
    for (let i = 0; i < 20 && alive; i++) {
      engine.applyMove({ direction: "right" })
      alive = engine.isAlive()
    }

    expect(engine.isAlive()).toBe(false)
    expect(engine.getTerminationReason()).toBe("death")
  })

  it("dies on self collision", () => {
    // Create a longer snake that can hit itself
    const engine = createSnakeEngine(makeConfig({ initialLength: 5 }))

    // Move in a tight square to collide with self
    // Initial direction is right, snake body extends left
    engine.applyMove({ direction: "down" })
    engine.applyMove({ direction: "left" })
    engine.applyMove({ direction: "up" })
    // This should cause self-collision (head moves into body)

    expect(engine.isAlive()).toBe(false)
    expect(engine.getTerminationReason()).toBe("death")
  })

  it("spawns food at a new position after being eaten", () => {
    const engine = createSnakeEngine(makeConfig({ gridWidth: 10, gridHeight: 10 }))

    // Track food positions
    const foodPositions: Array<{ x: number; y: number }> = []
    foodPositions.push({ ...engine.getState().food })

    // Navigate to food
    let ate = false
    for (let i = 0; i < 100 && !ate; i++) {
      const s = engine.getState()
      if (!s.alive) break
      const dx = s.food.x - s.snake[0].x
      const dy = s.food.y - s.snake[0].y

      let dir: "up" | "down" | "left" | "right" = "right"
      if (dx > 0) dir = "right"
      else if (dx < 0) dir = "left"
      else if (dy > 0) dir = "down"
      else if (dy < 0) dir = "up"

      const prevScore = s.score
      engine.applyMove({ direction: dir })

      if (engine.getScore() > prevScore) {
        ate = true
        foodPositions.push({ ...engine.getState().food })
      }
    }

    expect(ate).toBe(true)
    // Food should have moved to a new position (or same by coincidence, but not on snake body)
    const lastFood = foodPositions[foodPositions.length - 1]
    const snakeBody = engine.getState().snake
    const foodOnSnake = snakeBody.some(
      (seg) => seg.x === lastFood.x && seg.y === lastFood.y
    )
    expect(foodOnSnake).toBe(false)
  })

  it("ignores opposite direction move", () => {
    const engine = createSnakeEngine(makeConfig())
    // Default direction is right, so moving left should be ignored
    const stateBefore = engine.getState()
    const headBefore = stateBefore.snake[0]

    engine.applyMove({ direction: "left" }) // opposite of right -- should be ignored

    const stateAfter = engine.getState()
    // Snake should have moved right (continued in current direction)
    expect(stateAfter.snake[0].x).toBe(headBefore.x + 1)
  })

  it("terminates at maxTicks with reason completed", () => {
    const engine = createSnakeEngine(makeConfig({ maxTicks: 5, gridWidth: 40, gridHeight: 40 }))

    for (let i = 0; i < 5; i++) {
      if (!engine.isAlive()) break
      engine.applyMove({ direction: "right" })
    }

    expect(engine.getTick()).toBe(5)
    expect(engine.getTerminationReason()).toBe("completed")
  })

  it("getFrame returns complete frame data including agentMove and agentReasoning", () => {
    const engine = createSnakeEngine(makeConfig())
    const frame = engine.applyMove({
      direction: "down",
      reasoning: "avoiding wall",
    })

    expect(frame.tick).toBe(1)
    expect(frame.state).toBeDefined()
    expect(frame.agentMove).toBe("down")
    expect(frame.agentReasoning).toBe("avoiding wall")
  })
})
