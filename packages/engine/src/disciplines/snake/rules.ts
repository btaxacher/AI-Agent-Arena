import type { Direction } from "@repo/shared"
import type { SnakeGameConfig } from "./types.js"

export const DEFAULT_SNAKE_CONFIG: SnakeGameConfig = {
  gridWidth: 20,
  gridHeight: 20,
  maxTicks: 500,
  initialLength: 3,
  seed: "default",
  tickRate: 5,
}

export const OPPOSITE_DIRECTIONS: Readonly<Record<Direction, Direction>> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
}

export const DIRECTION_VECTORS: Readonly<
  Record<Direction, Readonly<{ dx: number; dy: number }>>
> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}
