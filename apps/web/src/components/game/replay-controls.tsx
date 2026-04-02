"use client"

interface ReplayControlsProps {
  readonly totalFrames: number
  readonly currentFrame: number
  readonly isPlaying: boolean
  readonly onPlay: () => void
  readonly onPause: () => void
  readonly onStep: (delta: number) => void
  readonly onSeek: (frame: number) => void
}

export default function ReplayControls({
  totalFrames,
  currentFrame,
  isPlaying,
  onPlay,
  onPause,
  onStep,
  onSeek,
}: ReplayControlsProps) {
  return (
    <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2 mt-2">
      {/* Step backward */}
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={currentFrame <= 0}
        className="px-2 py-1 rounded text-sm font-mono text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Step backward"
      >
        &#9664;&#9664;
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        onClick={isPlaying ? onPause : onPlay}
        className="px-3 py-1 rounded text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 min-w-[60px]"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>

      {/* Step forward */}
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={currentFrame >= totalFrames - 1}
        className="px-2 py-1 rounded text-sm font-mono text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Step forward"
      >
        &#9654;&#9654;
      </button>

      {/* Frame scrubber */}
      <input
        type="range"
        min={0}
        max={Math.max(0, totalFrames - 1)}
        value={currentFrame}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="flex-1 accent-blue-500"
      />

      {/* Frame counter */}
      <span className="text-xs font-mono text-gray-400 min-w-[80px] text-right">
        {currentFrame + 1} / {totalFrames}
      </span>
    </div>
  )
}
