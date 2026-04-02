"use client"

import { useState } from "react"

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

interface AgentListProps {
  agents: AgentMetadata[]
  onDelete: (id: string) => Promise<void>
}

export function AgentList({ agents, onDelete }: AgentListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await onDelete(id)
    } finally {
      setDeleting(null)
    }
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No agents yet</p>
        <p className="text-sm mt-1">Upload an agent or link one from GitHub to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{agent.name}</h3>
              {agent.description && (
                <p className="text-sm text-gray-500 mt-1">{agent.description}</p>
              )}
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                agent.sourceType === "github"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {agent.sourceType === "github" ? "GitHub" : "Upload"}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
            <span>v{agent.version}</span>
            <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="mt-3">
            <button
              onClick={() => handleDelete(agent.id)}
              disabled={deleting === agent.id}
              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {deleting === agent.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
