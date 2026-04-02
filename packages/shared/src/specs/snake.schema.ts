import { z } from "zod"

const pointSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
})

const directionSchema = z.enum(["up", "down", "left", "right"])

export const snakeGameStateSchema = z.object({
  tick: z.number().int().nonnegative(),
  snake: z.array(pointSchema),
  food: pointSchema,
  direction: directionSchema,
  score: z.number().int().nonnegative(),
  alive: z.boolean(),
  gridWidth: z.number().int().positive(),
  gridHeight: z.number().int().positive(),
})

export const snakeMoveSchema = z.object({
  direction: directionSchema,
  reasoning: z.string().max(200).optional(),
})

export type SnakeGameState = z.infer<typeof snakeGameStateSchema>
export type SnakeMove = z.infer<typeof snakeMoveSchema>
export type Direction = z.infer<typeof directionSchema>
export type Point = z.infer<typeof pointSchema>

export const snakeGameStateJsonSchema = z.toJSONSchema(snakeGameStateSchema)
export const snakeMoveJsonSchema = z.toJSONSchema(snakeMoveSchema)

export const snakeSpec = {
  discipline: "snake" as const,
  version: "1.0.0",
  gameStateSchema: snakeGameStateSchema,
  moveSchema: snakeMoveSchema,
  gameStateJsonSchema: snakeGameStateJsonSchema,
  moveJsonSchema: snakeMoveJsonSchema,
}
