import type { SnakeGameState, SnakeMove, Point, Direction } from "@repo/shared"
import type { SnakeGameConfig, SnakeFrame, SnakeEngine } from "./types.js"
import { OPPOSITE_DIRECTIONS, DIRECTION_VECTORS } from "./rules.js"

interface Rng {
  nextInt(min: number, pseudoMax: number): number
}

// Dynamic import to handle CJS/ESM interop with prando
function createRng(seed: string): Rng {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("prando")
  const PrandoClass = typeof mod === "function" ? mod : mod.default
  return new PrandoClass(seed) as Rng
}

function spawnFood(
  rng: Rng,
  gridWidth: number,
  gridHeight: number,
  snake: ReadonlyArray<Point>
): Point {
  const totalCells = gridWidth * gridHeight
  const occupied = new Set(snake.map((s) => s.y * gridWidth + s.x))

  const emptyCellCount = totalCells - occupied.size
  if (emptyCellCount <= 0) {
    return { x: 0, y: 0 }
  }

  const targetIndex = Math.abs(rng.nextInt(0, emptyCellCount - 1))
  let emptyIndex = 0

  for (let i = 0; i < totalCells; i++) {
    if (!occupied.has(i)) {
      if (emptyIndex === targetIndex) {
        const x = i % gridWidth
        const y = Math.floor(i / gridWidth)
        return { x, y }
      }
      emptyIndex++
    }
  }

  return { x: 0, y: 0 }
}

export function createSnakeEngine(config: SnakeGameConfig): SnakeEngine {
  const rng = createRng(config.seed)

  // Initialize snake at center, extending left
  const centerX = Math.floor(config.gridWidth / 2)
  const centerY = Math.floor(config.gridHeight / 2)

  const initialSnake: Point[] = []
  for (let i = 0; i < config.initialLength; i++) {
    initialSnake.push({ x: centerX - i, y: centerY })
  }

  const initialFood = spawnFood(
    rng,
    config.gridWidth,
    config.gridHeight,
    initialSnake
  )

  let state: SnakeGameState = {
    tick: 0,
    snake: initialSnake,
    food: initialFood,
    direction: "right" as Direction,
    score: 0,
    alive: true,
    gridWidth: config.gridWidth,
    gridHeight: config.gridHeight,
  }

  let terminationReason: "completed" | "death" | null = null

  function applyMove(move: SnakeMove): SnakeFrame {
    if (!state.alive || state.tick >= config.maxTicks) {
      return {
        tick: state.tick,
        state: { ...state },
        agentMove: move.direction,
        agentReasoning: move.reasoning ?? null,
      }
    }

    // Validate direction -- ignore opposite
    let newDirection: Direction = state.direction
    if (OPPOSITE_DIRECTIONS[move.direction] !== state.direction) {
      newDirection = move.direction
    }

    // Calculate new head position (integer arithmetic only)
    const vector = DIRECTION_VECTORS[newDirection]
    const currentHead = state.snake[0]
    const newHead: Point = {
      x: currentHead.x + vector.dx,
      y: currentHead.y + vector.dy,
    }

    // Check wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= config.gridWidth ||
      newHead.y < 0 ||
      newHead.y >= config.gridHeight
    ) {
      const newTick = state.tick + 1
      state = {
        ...state,
        tick: newTick,
        direction: newDirection,
        alive: false,
      }
      terminationReason = "death"
      return {
        tick: newTick,
        state: { ...state },
        agentMove: move.direction,
        agentReasoning: move.reasoning ?? null,
      }
    }

    // Check self collision
    const selfCollision = state.snake.some(
      (seg) => seg.x === newHead.x && seg.y === newHead.y
    )
    if (selfCollision) {
      const newTick = state.tick + 1
      state = {
        ...state,
        tick: newTick,
        direction: newDirection,
        alive: false,
      }
      terminationReason = "death"
      return {
        tick: newTick,
        state: { ...state },
        agentMove: move.direction,
        agentReasoning: move.reasoning ?? null,
      }
    }

    // Check if food eaten
    const ateFood =
      newHead.x === state.food.x && newHead.y === state.food.y

    // Build new snake: add head, conditionally keep tail
    const newSnake = [newHead, ...state.snake]
    if (!ateFood) {
      newSnake.pop()
    }

    const newScore = ateFood ? state.score + 1 : state.score
    const newFood = ateFood
      ? spawnFood(rng, config.gridWidth, config.gridHeight, newSnake)
      : state.food

    const newTick = state.tick + 1

    state = {
      tick: newTick,
      snake: newSnake,
      food: newFood,
      direction: newDirection,
      score: newScore,
      alive: true,
      gridWidth: config.gridWidth,
      gridHeight: config.gridHeight,
    }

    // Check if maxTicks reached
    if (newTick >= config.maxTicks) {
      terminationReason = "completed"
    }

    return {
      tick: newTick,
      state: { ...state },
      agentMove: move.direction,
      agentReasoning: move.reasoning ?? null,
    }
  }

  return {
    getState: () => ({ ...state }),
    applyMove,
    isAlive: () => state.alive,
    getTick: () => state.tick,
    getScore: () => state.score,
    getTerminationReason: () => terminationReason,
  }
}
