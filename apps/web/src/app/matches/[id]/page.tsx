"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import GameCanvas from "@/components/game/game-canvas"
import Link from "next/link"

interface MatchData {
  readonly id: string
  readonly userId: string
  readonly agentId: string
  readonly discipline: string
  readonly seed: string
  readonly status: string
  readonly score: number | null
  readonly ticksPlayed: number | null
  readonly terminationReason: string | null
  readonly errorMessage: string | null
  readonly frames: ReadonlyArray<{
    readonly tick: number
    readonly state: {
      readonly tick: number
      readonly snake: ReadonlyArray<{ readonly x: number; readonly y: number }>
      readonly food: { readonly x: number; readonly y: number }
      readonly direction: string
      readonly score: number
      readonly alive: boolean
      readonly gridWidth: number
      readonly gridHeight: number
    }
    readonly agentMove: string | null
    readonly agentReasoning: string | null
  }> | null
  readonly createdAt: string
  readonly completedAt: string | null
}

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-600",
  running: "bg-blue-600",
  completed: "bg-green-600",
  error: "bg-red-600",
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [match, setMatch] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const matchId = params.id as string

  useEffect(() => {
    if (isPending) return
    if (!session) {
      router.push("/sign-in")
      return
    }

    async function fetchMatch() {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
        const res = await fetch(`${apiUrl}/api/matches/${matchId}`, {
          credentials: "include",
        })
        const body = await res.json()

        if (!body.success) {
          setError(body.error ?? "Failed to load match")
          return
        }

        setMatch(body.data)
      } catch {
        setError("Failed to fetch match data")
      } finally {
        setLoading(false)
      }
    }

    fetchMatch()
  }, [session, isPending, router, matchId])

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading match...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link
            href="/matches"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Back to matches
          </Link>
        </div>
      </div>
    )
  }

  if (!match) return null

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/matches"
              className="text-sm text-gray-400 hover:text-gray-300 mb-1 block"
            >
              &larr; Back to matches
            </Link>
            <h1 className="text-2xl font-bold text-white">
              Match: {match.discipline.toUpperCase()}
            </h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[match.status] ?? "bg-gray-600"}`}
          >
            {match.status}
          </span>
        </div>

        {/* Match metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-400">Score</p>
            <p className="text-lg font-bold text-white">
              {match.score ?? "--"}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-400">Ticks</p>
            <p className="text-lg font-bold text-white">
              {match.ticksPlayed ?? "--"}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-400">Termination</p>
            <p className="text-lg font-bold text-white">
              {match.terminationReason ?? "--"}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-400">Created</p>
            <p className="text-sm text-white">
              {new Date(match.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Game view */}
        <div className="flex justify-center">
          {match.status === "completed" && match.frames && match.frames.length > 0 && (
            <GameCanvas
              mode="replay"
              frames={match.frames as never}
            />
          )}

          {match.status === "running" && (
            <GameCanvas mode="live" matchId={match.id} />
          )}

          {match.status === "queued" && (
            <div className="flex items-center justify-center w-[600px] h-[600px] bg-gray-900 rounded-lg">
              <div className="text-center">
                <div className="animate-pulse text-4xl mb-4">&#9203;</div>
                <p className="text-gray-400">Match queued, waiting to start...</p>
              </div>
            </div>
          )}

          {match.status === "error" && (
            <div className="flex items-center justify-center w-[600px] h-[600px] bg-gray-900 rounded-lg">
              <div className="text-center">
                <p className="text-red-400 text-lg mb-2">Match Error</p>
                <p className="text-gray-400 text-sm">
                  {match.errorMessage ?? "Unknown error occurred"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
