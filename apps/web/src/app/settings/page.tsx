"use client"

import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { ApiKeyManager } from "@/components/api-key-manager"

export default function SettingsPage() {
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
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-300"
        >
          &larr; Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <ApiKeyManager />
    </div>
  )
}
