"use client"

import { useState, useEffect, useCallback } from "react"
import { authClient } from "@/lib/auth-client"

interface ApiKeyInfo {
  id: string
  name: string | null
  start: string | null
  prefix: string | null
  enabled: boolean | null
  createdAt: string
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const loadKeys = useCallback(async () => {
    try {
      const result = await authClient.apiKey.list()
      if (result.data) {
        setKeys(result.data as unknown as ApiKeyInfo[])
      }
    } catch {
      setError("Failed to load API keys.")
    }
  }, [])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  async function handleCreate() {
    if (!newKeyName.trim()) {
      setError("Please enter a name for the API key.")
      return
    }

    setLoading(true)
    setError("")
    setCreatedKey(null)

    try {
      const result = await authClient.apiKey.create({
        name: newKeyName.trim(),
      })
      if (result.data?.key) {
        setCreatedKey(result.data.key)
        setNewKeyName("")
        await loadKeys()
      } else if (result.error) {
        setError(
          (result.error as { message?: string }).message ??
            "Failed to create API key."
        )
      }
    } catch {
      setError("Failed to create API key.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      await authClient.apiKey.delete({ keyId })
      await loadKeys()
    } catch {
      setError("Failed to revoke API key.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">API Keys</h2>
        <p className="mt-1 text-sm text-gray-400">
          Create and manage API keys for programmatic access to the platform.
        </p>
      </div>

      {/* Create new key */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <h3 className="text-sm font-medium text-gray-300">
          Create new API key
        </h3>
        <div className="mt-3 flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., 'CI Pipeline')"
            className="flex-1 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      {/* Show created key (once only) */}
      {createdKey && (
        <div className="rounded-lg border border-yellow-700 bg-yellow-900/20 p-4">
          <p className="text-sm font-medium text-yellow-400">
            API key created. Copy it now -- you will not see it again.
          </p>
          <code className="mt-2 block break-all rounded bg-gray-800 p-3 text-sm text-gray-100">
            {createdKey}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(createdKey)
            }}
            className="mt-2 rounded-md border border-gray-700 px-3 py-1 text-sm text-gray-300 hover:bg-gray-800"
          >
            Copy to clipboard
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Key list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">Your API keys</h3>
        {keys.length === 0 ? (
          <p className="text-sm text-gray-500">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-100">
                    {key.name ?? "Unnamed key"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {key.start ?? key.prefix ?? "***"}...{" "}
                    {key.enabled !== false ? (
                      <span className="text-green-400">Active</span>
                    ) : (
                      <span className="text-red-400">Disabled</span>
                    )}
                    {" | Created "}
                    {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="rounded-md border border-red-800 px-3 py-1 text-sm text-red-400 hover:bg-red-900/30"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
