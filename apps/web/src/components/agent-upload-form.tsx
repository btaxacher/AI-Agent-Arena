"use client"

import { useState } from "react"

interface AgentUploadFormProps {
  onSuccess: () => void
}

export function AgentUploadForm({ onSuccess }: AgentUploadFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      setError("File exceeds maximum size of 1MB")
      return
    }

    const text = await file.text()
    setCode(text)
    setError(null)

    if (!name) {
      setName(file.name.replace(/\.tsx?$/, ""))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
      const res = await fetch(`${apiUrl}/api/agents/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          description: description || undefined,
          code,
        }),
      })

      const body = await res.json()

      if (!body.success) {
        setError(body.error ?? "Upload failed")
        return
      }

      setName("")
      setDescription("")
      setCode("")
      onSuccess()
    } catch {
      setError("Failed to upload agent. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="upload-name" className="block text-sm font-medium text-gray-700">
          Agent Name
        </label>
        <input
          id="upload-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="My Agent"
        />
      </div>

      <div>
        <label htmlFor="upload-description" className="block text-sm font-medium text-gray-700">
          Description (optional)
        </label>
        <input
          id="upload-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="A brief description of your agent"
        />
      </div>

      <div>
        <label htmlFor="upload-file" className="block text-sm font-medium text-gray-700">
          Agent File (.ts)
        </label>
        <input
          id="upload-file"
          type="file"
          accept=".ts,.tsx"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div>
        <label htmlFor="upload-code" className="block text-sm font-medium text-gray-700">
          Or paste code directly
        </label>
        <textarea
          id="upload-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={10}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder={'export function move(state: GameState): string {\n  return "up";\n}'}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !name || !code}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Uploading..." : "Upload Agent"}
      </button>
    </form>
  )
}
