export const SNAKE_STARTER_AGENT_SOURCE = `
interface Point {
  x: number
  y: number
}

interface SnakeGameState {
  tick: number
  snake: Point[]
  food: Point
  direction: "up" | "down" | "left" | "right"
  score: number
  alive: boolean
  gridWidth: number
  gridHeight: number
}

interface SnakeMove {
  direction: "up" | "down" | "left" | "right"
  reasoning?: string
}

function move(state: SnakeGameState): SnakeMove {
  const head = state.snake[0]
  const food = state.food

  const dx = food.x - head.x
  const dy = food.y - head.y

  type Dir = "up" | "down" | "left" | "right"
  const candidates: Dir[] = []

  if (dx > 0) candidates.push("right")
  if (dx < 0) candidates.push("left")
  if (dy > 0) candidates.push("down")
  if (dy < 0) candidates.push("up")

  if (candidates.length === 0) {
    candidates.push("right", "down", "left", "up")
  }

  const opposite: Record<Dir, Dir> = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  }

  const chosen = candidates.find(d => d !== opposite[state.direction])
    ?? candidates[0]

  const manhattan = Math.abs(dx) + Math.abs(dy)
  return {
    direction: chosen,
    reasoning: \`Food is \${manhattan} steps away, moving \${chosen}\`,
  }
}
`.trim()
