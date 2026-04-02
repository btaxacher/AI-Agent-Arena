export type MatchStatus = "queued" | "running" | "completed" | "error"

export type TerminationReason = "completed" | "timeout" | "crash" | "death"

export interface MatchMetadata {
  readonly id: string
  readonly userId: string
  readonly agentId: string
  readonly discipline: string
  readonly seed: string
  readonly status: MatchStatus
  readonly score: number
  readonly ticksPlayed: number
  readonly terminationReason: TerminationReason | null
  readonly createdAt: Date
  readonly completedAt: Date | null
}
