import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  snakeGameStateSchema,
  snakeMoveSchema,
  snakeGameStateJsonSchema,
  snakeMoveJsonSchema,
  snakeSpec,
  type SnakeGameState,
  type SnakeMove,
} from "../snake.schema.js"
import { SNAKE_STARTER_AGENT_SOURCE } from "../snake-starter.js"

describe("snakeGameStateSchema", () => {
  it("validates a correct game state object", () => {
    const validState = {
      tick: 0,
      snake: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
      ],
      food: { x: 10, y: 10 },
      direction: "right" as const,
      score: 0,
      alive: true,
      gridWidth: 20,
      gridHeight: 20,
    }

    const result = snakeGameStateSchema.safeParse(validState)
    expect(result.success).toBe(true)
  })

  it("rejects invalid state with missing fields", () => {
    const invalid = { tick: 0, snake: [] }
    const result = snakeGameStateSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it("rejects invalid state with wrong types", () => {
    const invalid = {
      tick: "zero",
      snake: [{ x: 5, y: 5 }],
      food: { x: 10, y: 10 },
      direction: "right",
      score: 0,
      alive: true,
      gridWidth: 20,
      gridHeight: 20,
    }
    const result = snakeGameStateSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})

describe("snakeMoveSchema", () => {
  it("validates direction only", () => {
    const result = snakeMoveSchema.safeParse({ direction: "up" })
    expect(result.success).toBe(true)
  })

  it("validates direction with reasoning", () => {
    const result = snakeMoveSchema.safeParse({
      direction: "left",
      reasoning: "toward food",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid direction", () => {
    const result = snakeMoveSchema.safeParse({ direction: "diagonal" })
    expect(result.success).toBe(false)
  })
})

describe("JSON Schema generation", () => {
  it("snakeGameStateJsonSchema is valid JSON Schema with correct $schema field", () => {
    expect(snakeGameStateJsonSchema).toBeDefined()
    expect(snakeGameStateJsonSchema.$schema).toContain("json-schema.org")
    expect(snakeGameStateJsonSchema.type).toBe("object")
    expect(snakeGameStateJsonSchema.properties).toBeDefined()
  })

  it("snakeMoveJsonSchema is valid JSON Schema", () => {
    expect(snakeMoveJsonSchema).toBeDefined()
    expect(snakeMoveJsonSchema.$schema).toContain("json-schema.org")
    expect(snakeMoveJsonSchema.type).toBe("object")
    expect(snakeMoveJsonSchema.properties).toBeDefined()
  })

  it("snake.json file matches the exported JSON Schema objects", () => {
    const jsonPath = resolve(__dirname, "../snake.json")
    const raw = readFileSync(jsonPath, "utf-8")
    const parsed = JSON.parse(raw)
    expect(parsed.gameState).toEqual(snakeGameStateJsonSchema)
    expect(parsed.move).toEqual(snakeMoveJsonSchema)
  })
})

describe("Type compatibility", () => {
  it("SnakeGameState type matches expected shape (compile-time check)", () => {
    const state: SnakeGameState = {
      tick: 0,
      snake: [{ x: 0, y: 0 }],
      food: { x: 1, y: 1 },
      direction: "up",
      score: 0,
      alive: true,
      gridWidth: 20,
      gridHeight: 20,
    }
    expect(state.tick).toBe(0)
    expect(state.alive).toBe(true)
  })
})

describe("snakeSpec", () => {
  it("contains discipline name and version", () => {
    expect(snakeSpec.discipline).toBe("snake")
    expect(snakeSpec.version).toBeDefined()
  })
})

describe("Starter agent", () => {
  it("source is valid TypeScript string containing move function", () => {
    expect(typeof SNAKE_STARTER_AGENT_SOURCE).toBe("string")
    expect(SNAKE_STARTER_AGENT_SOURCE).toContain("function move")
    expect(SNAKE_STARTER_AGENT_SOURCE).toContain("SnakeGameState")
    expect(SNAKE_STARTER_AGENT_SOURCE).toContain("SnakeMove")
  })
})
