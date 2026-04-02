"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface MatchSummary {
  readonly id: string
  readonly discipline: string
  readonly status: string
  readonly score: number | null
  readonly ticksPlayed: number | null
  readonly terminationReason: string | null
  readonly createdAt: string
  readonly completedAt: string | null
}

interface AgentSummary {
  readonly id: string
  readonly name: string
}

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-600",
  running: "bg-blue-600",
  completed: "bg-green-600",
  error: "bg-red-600",
}

export default function MatchesPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

  const fetchData = useCallback(async () => {
    try {
      const [matchRes, agentRes] = await Promise.all([
        fetch(`${apiUrl}/api/matches`, { credentials: "include" }),
        fetch(`${apiUrl}/api/agents`, { credentials: "include" }),
      ])

      const matchBody = await matchRes.json()
      const agentBody = await agentRes.json()

      if (matchBody.success) {
        setMatches(matchBody.data)
      }
      if (agentBody.success) {
        setAgents(agentBody.data)
      }
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    if (isPending) return
    if (!session) {
      router.push("/sign-in")
      return
    }
    fetchData()
  }, [session, isPending, router, fetchData])

  async function handleStartMatch() {
    if (agents.length === 0) return

    setStarting(true)
    try {
      const res = await fetch(`${apiUrl}/api/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agentId: agents[0].id,
          discipline: "snake",
        }),
      })
      const body = await res.json()

      if (body.success) {
        router.push(`/matches/${body.data.id}`)
      }
    } finally {
      setStarting(false)
    }
  }

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">My Matches</h1>
          <button
            type="button"
            onClick={handleStartMatch}
            disabled={agents.length === 0 || starting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {starting ? "Starting..." : "Start New Match"}
          </button>
        </div>

        {agents.length === 0 && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6 text-center">
            <p className="text-gray-400 mb-2">
              You need at least one agent to start a match.
            </p>
            <Link
              href="/agents/upload"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Upload an agent
            </Link>
          </div>
        )}

        {matches.length === 0 && agents.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-6 text-center">
            <p className="text-gray-400">
              No matches yet. Start your first match!
            </p>
          </div>
        )}

        <div className="grid gap-4">
          {matches.map((match) => (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className="block bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-600 text-white uppercase">
                    {match.discipline}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium text-white ${STATUS_COLORS[match.status] ?? "bg-gray-600"}`}
                  >
                    {match.status}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(match.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-6 text-sm">
                <span className="text-gray-300">
                  Score:{" "}
                  <span className="font-bold text-white">
                    {match.score ?? "--"}
                  </span>
                </span>
                <span className="text-gray-300">
                  Ticks:{" "}
                  <span className="font-bold text-white">
                    {match.ticksPlayed ?? "--"}
                  </span>
                </span>
                {match.terminationReason && (
                  <span className="text-gray-400 text-xs">
                    {match.terminationReason}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
