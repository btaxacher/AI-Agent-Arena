"use client"

import { useSession, signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in")
    }
  }, [isPending, session, router])

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push("/sign-in") } })}
          className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
        >
          Sign out
        </button>
      </div>

      <div className="mt-8 rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-xl font-semibold">
          Welcome, {session.user.name ?? session.user.email}
        </h2>
        <p className="mt-2 text-gray-400">
          You are signed in as {session.user.email}
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/settings"
          className="rounded-lg border border-gray-800 bg-gray-900 p-6 transition hover:border-gray-700"
        >
          <h3 className="font-semibold">API Keys</h3>
          <p className="mt-1 text-sm text-gray-400">
            Manage your API keys for programmatic access
          </p>
        </Link>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 opacity-50">
          <h3 className="font-semibold">Agents</h3>
          <p className="mt-1 text-sm text-gray-400">
            Upload and manage your AI agents (coming soon)
          </p>
        </div>
      </div>
    </div>
  )
}
