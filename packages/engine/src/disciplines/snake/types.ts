import type { SnakeGameState, SnakeMove } from "@repo/shared"

export interface SnakeGameConfig {
  readonly gridWidth: number
  readonly gridHeight: number
  readonly maxTicks: number
  readonly initialLength: number
  readonly seed: string
  readonly tickRate: number
}

export interface SnakeFrame {
  readonly tick: number
  readonly state: SnakeGameState
  readonly agentMove: string | null
  readonly agentReasoning: string | null
}

export interface SnakeEngine {
  getState(): SnakeGameState
  applyMove(move: SnakeMove): SnakeFrame
  isAlive(): boolean
  getTick(): number
  getScore(): number
  getTerminationReason(): "completed" | "death" | null
}
