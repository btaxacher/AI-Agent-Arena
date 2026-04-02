"use client"

import { useState } from "react"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AgentUploadForm } from "@/components/agent-upload-form"
import { AgentGitHubLinkForm } from "@/components/agent-github-link-form"
import Link from "next/link"

type Tab = "upload" | "github"

export default function AgentUploadPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("upload")

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in")
    }
  }, [session, isPending, router])

  function handleSuccess() {
    router.push("/agents")
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-xl px-4">
        <div className="mb-6">
          <Link href="/agents" className="text-sm text-blue-600 hover:text-blue-800">
            &larr; Back to Agents
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">New Agent</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 px-4 py-3 text-sm font-medium text-center ${
                activeTab === "upload"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setActiveTab("github")}
              className={`flex-1 px-4 py-3 text-sm font-medium text-center ${
                activeTab === "github"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Link GitHub
            </button>
          </div>

          <div className="p-6">
            {activeTab === "upload" ? (
              <AgentUploadForm onSuccess={handleSuccess} />
            ) : (
              <AgentGitHubLinkForm onSuccess={handleSuccess} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
