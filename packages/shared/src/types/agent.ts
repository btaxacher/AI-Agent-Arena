export type AgentSourceType = "upload" | "github"

export interface AgentMetadata {
  id: string
  name: string
  description: string | null
  sourceType: AgentSourceType
  sourceUrl: string | null
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AgentUploadInput {
  name: string
  description?: string
  code: string
}

export interface AgentGitHubLinkInput {
  name: string
  description?: string
  repoUrl: string
  filePath: string
}
