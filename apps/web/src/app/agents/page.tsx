"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "@/lib/auth-client"
import { AgentList } from "@/components/agent-list"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface AgentMetadata {
  id: string
  name: string
  description: string | null
  sourceType: "upload" | "github"
  sourceUrl: string | null
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function AgentsPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [agents, setAgents] = useState<AgentMetadata[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
      const res = await fetch(`${apiUrl}/api/agents`, {
        credentials: "include",
      })
      const body = await res.json()
      if (body.success) {
        setAgents(body.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isPending) return
    if (!session) {
      router.push("/sign-in")
      return
    }
    fetchAgents()
  }, [session, isPending, router, fetchAgents])

  async function handleDelete(id: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
    const res = await fetch(`${apiUrl}/api/agents/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
    const body = await res.json()
    if (body.success) {
      setAgents((prev) => prev.filter((a) => a.id !== id))
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Agents</h1>
          <Link
            href="/agents/upload"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Agent
          </Link>
        </div>
        <AgentList agents={agents} onDelete={handleDelete} />
      </div>
    </div>
  )
}
