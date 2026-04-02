const GITHUB_URL_PATTERN =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/(?:tree|blob)\/([^/]+))?/

const MAX_FILE_SIZE = 1024 * 1024 // 1MB

export async function fetchAgentFromGitHub(
  repoUrl: string,
  filePath: string
): Promise<string> {
  const match = repoUrl.match(GITHUB_URL_PATTERN)
  if (!match) {
    throw new Error(
      "Invalid GitHub URL. Expected format: https://github.com/owner/repo"
    )
  }

  const [, owner, repo, branch = "main"] = match
  const cleanFilePath = filePath.replace(/^\//, "")
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanFilePath}`

  const response = await fetch(rawUrl)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `File not found: ${cleanFilePath} in ${owner}/${repo}@${branch}`
      )
    }
    throw new Error(
      `Failed to fetch from GitHub: ${response.status} ${response.statusText}`
    )
  }

  const contentLength = response.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
    throw new Error("File exceeds maximum size of 1MB")
  }

  const content = await response.text()

  if (content.length > MAX_FILE_SIZE) {
    throw new Error("File exceeds maximum size of 1MB")
  }

  return content
}
