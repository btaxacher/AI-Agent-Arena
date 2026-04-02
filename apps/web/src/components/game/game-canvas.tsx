"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import DecisionOverlay from "./decision-overlay"
import ReplayControls from "./replay-controls"

const SnakeRenderer = dynamic(() => import("./snake-renderer"), { ssr: false })

interface Point {
  readonly x: number
  readonly y: number
}

interface SnakeGameState {
  readonly tick: number
  readonly snake: readonly Point[]
  readonly food: Point
  readonly direction: string
  readonly score: number
  readonly alive: boolean
  readonly gridWidth: number
  readonly gridHeight: number
}

interface SnakeFrame {
  readonly tick: number
  readonly state: SnakeGameState
  readonly agentMove: string | null
  readonly agentReasoning: string | null
}

interface GameCanvasReplayProps {
  readonly mode: "replay"
  readonly frames: SnakeFrame[]
}

interface GameCanvasLiveProps {
  readonly mode: "live"
  readonly matchId: string
}

type GameCanvasProps = GameCanvasReplayProps | GameCanvasLiveProps

const PLAYBACK_INTERVAL_MS = 200

export default function GameCanvas(props: GameCanvasProps) {
  const [frames, setFrames] = useState<SnakeFrame[]>(
    props.mode === "replay" ? props.frames : []
  )
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Live mode: WebSocket connection
  useEffect(() => {
    if (props.mode !== "live") return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
    const wsUrl = apiUrl.replace(/^http/, "ws")
    const ws = new WebSocket(
      `${wsUrl}/ws/matches/${props.matchId}/spectate`
    )
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string
          data: SnakeFrame
        }
        if (msg.type === "frame") {
          setFrames((prev) => [...prev, msg.data])
          setCurrentFrameIndex((prev) => prev + 1)
        }
      } catch {
        // Ignore unparseable messages
      }
    }

    ws.onopen = () => {
      setIsPlaying(true)
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [props.mode, props.mode === "live" ? props.matchId : null])

  // Playback timer
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, PLAYBACK_INTERVAL_MS)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaying, frames.length])

  const handlePlay = useCallback(() => {
    if (currentFrameIndex >= frames.length - 1) {
      setCurrentFrameIndex(0)
    }
    setIsPlaying(true)
  }, [currentFrameIndex, frames.length])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const handleStep = useCallback(
    (delta: number) => {
      setIsPlaying(false)
      setCurrentFrameIndex((prev) =>
        Math.max(0, Math.min(frames.length - 1, prev + delta))
      )
    },
    [frames.length]
  )

  const handleSeek = useCallback((frame: number) => {
    setIsPlaying(false)
    setCurrentFrameIndex(frame)
  }, [])

  const currentFrame = frames[currentFrameIndex] ?? null

  if (frames.length === 0) {
    return (
      <div className="flex items-center justify-center w-[600px] h-[600px] bg-gray-900 rounded-lg">
        <p className="text-gray-500">
          {props.mode === "live"
            ? "Waiting for match data..."
            : "No frames available"}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="relative inline-block">
        <SnakeRenderer
          frames={frames}
          currentFrameIndex={currentFrameIndex}
        />
        {currentFrame && (
          <DecisionOverlay
            agentMove={currentFrame.agentMove}
            agentReasoning={currentFrame.agentReasoning}
            tick={currentFrame.tick}
            score={currentFrame.state.score}
          />
        )}
      </div>
      {props.mode === "replay" && (
        <ReplayControls
          totalFrames={frames.length}
          currentFrame={currentFrameIndex}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onPause={handlePause}
          onStep={handleStep}
          onSeek={handleSeek}
        />
      )}
    </div>
  )
}
