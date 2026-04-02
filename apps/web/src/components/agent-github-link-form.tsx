"use client"

import { useState } from "react"

interface AgentGitHubLinkFormProps {
  onSuccess: () => void
}

export function AgentGitHubLinkForm({ onSuccess }: AgentGitHubLinkFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [filePath, setFilePath] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
      const res = await fetch(`${apiUrl}/api/agents/github-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          description: description || undefined,
          repoUrl,
          filePath,
        }),
      })

      const body = await res.json()

      if (!body.success) {
        setError(body.error ?? "Linking failed")
        return
      }

      setName("")
      setDescription("")
      setRepoUrl("")
      setFilePath("")
      onSuccess()
    } catch {
      setError("Failed to link agent. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="gh-name" className="block text-sm font-medium text-gray-700">
          Agent Name
        </label>
        <input
          id="gh-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="My GitHub Agent"
        />
      </div>

      <div>
        <label htmlFor="gh-description" className="block text-sm font-medium text-gray-700">
          Description (optional)
        </label>
        <input
          id="gh-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="A brief description of your agent"
        />
      </div>

      <div>
        <label htmlFor="gh-repo-url" className="block text-sm font-medium text-gray-700">
          GitHub Repository URL
        </label>
        <input
          id="gh-repo-url"
          type="url"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="https://github.com/username/repo"
        />
      </div>

      <div>
        <label htmlFor="gh-file-path" className="block text-sm font-medium text-gray-700">
          File Path
        </label>
        <input
          id="gh-file-path"
          type="text"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="src/agent.ts"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !name || !repoUrl || !filePath}
        className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Linking..." : "Link from GitHub"}
      </button>
    </form>
  )
}
