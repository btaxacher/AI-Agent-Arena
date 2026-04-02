"use client"

import { useEffect, useRef } from "react"

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

interface SnakeRendererProps {
  readonly frames: readonly SnakeFrame[]
  readonly currentFrameIndex: number
}

const CANVAS_SIZE = 600
const BG_COLOR = 0x1a1a2e
const GRID_COLOR = 0x2a2a4e
const SNAKE_BODY_COLOR = 0x22c55e
const SNAKE_HEAD_COLOR = 0x4ade80
const FOOD_COLOR = 0xef4444

export default function SnakeRenderer({
  frames,
  currentFrameIndex,
}: SnakeRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<unknown>(null)
  const graphicsRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let destroyed = false

    async function init() {
      const PIXI = await import("pixi.js")
      if (destroyed) return

      const app = new PIXI.Application()
      await app.init({
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        background: BG_COLOR,
        antialias: true,
      })

      if (destroyed) {
        app.destroy(true)
        return
      }

      containerRef.current?.appendChild(app.canvas as HTMLCanvasElement)
      const graphics = new PIXI.Graphics()
      app.stage.addChild(graphics)

      appRef.current = app
      graphicsRef.current = graphics
    }

    init()

    return () => {
      destroyed = true
      if (appRef.current) {
        const app = appRef.current as { destroy: (removeView: boolean) => void }
        app.destroy(true)
        appRef.current = null
        graphicsRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const graphics = graphicsRef.current as {
      clear: () => unknown
      rect: (x: number, y: number, w: number, h: number) => unknown
      circle: (x: number, y: number, r: number) => unknown
      stroke: (opts: { color: number; width: number; alpha?: number }) => void
      fill: (opts: { color: number }) => void
    } | null

    if (!graphics || frames.length === 0) return

    const frame = frames[currentFrameIndex]
    if (!frame) return

    const { state } = frame
    const cellSize = Math.floor(CANVAS_SIZE / state.gridWidth)

    graphics.clear()

    // Draw grid lines
    for (let x = 0; x <= state.gridWidth; x++) {
      graphics.rect(x * cellSize, 0, 1, state.gridHeight * cellSize)
      graphics.stroke({ color: GRID_COLOR, width: 1, alpha: 0.5 })
    }
    for (let y = 0; y <= state.gridHeight; y++) {
      graphics.rect(0, y * cellSize, state.gridWidth * cellSize, 1)
      graphics.stroke({ color: GRID_COLOR, width: 1, alpha: 0.5 })
    }

    // Draw food
    const foodCx = state.food.x * cellSize + cellSize / 2
    const foodCy = state.food.y * cellSize + cellSize / 2
    graphics.circle(foodCx, foodCy, cellSize / 2 - 2)
    graphics.fill({ color: FOOD_COLOR })

    // Draw snake body
    for (let i = 1; i < state.snake.length; i++) {
      const seg = state.snake[i]
      graphics.rect(
        seg.x * cellSize + 1,
        seg.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      )
      graphics.fill({ color: SNAKE_BODY_COLOR })
    }

    // Draw snake head
    if (state.snake.length > 0) {
      const head = state.snake[0]
      graphics.rect(
        head.x * cellSize + 1,
        head.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      )
      graphics.fill({ color: SNAKE_HEAD_COLOR })
    }
  }, [frames, currentFrameIndex])

  return (
    <div
      ref={containerRef}
      style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
      className="rounded-lg overflow-hidden"
    />
  )
}
