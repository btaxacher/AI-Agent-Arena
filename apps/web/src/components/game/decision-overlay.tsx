"use client"

interface DecisionOverlayProps {
  readonly agentMove: string | null
  readonly agentReasoning: string | null
  readonly tick: number
  readonly score: number
}

const DIRECTION_LABELS: Record<string, string> = {
  up: "UP",
  down: "DOWN",
  left: "LEFT",
  right: "RIGHT",
}

export default function DecisionOverlay({
  agentMove,
  agentReasoning,
  tick,
  score,
}: DecisionOverlayProps) {
  return (
    <div className="absolute top-2 left-2 right-2 bg-black/70 text-white rounded-lg p-3 text-sm pointer-events-none">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs text-gray-400">
          Tick {tick}
        </span>
        <span className="font-mono text-xs text-yellow-400">
          Score: {score}
        </span>
      </div>

      {agentMove && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-400 text-xs">Move:</span>
          <span className="font-bold text-green-400">
            {DIRECTION_LABELS[agentMove] ?? agentMove}
          </span>
        </div>
      )}

      {agentReasoning && (
        <div className="mt-1 border-t border-gray-600 pt-1">
          <span className="text-gray-400 text-xs block mb-0.5">
            Agent Reasoning:
          </span>
          <p className="text-gray-200 text-xs leading-relaxed">
            {agentReasoning}
          </p>
        </div>
      )}
    </div>
  )
}
