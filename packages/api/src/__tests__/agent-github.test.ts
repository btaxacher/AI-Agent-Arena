import { describe, it, expect, beforeEach, afterAll, vi } from "vitest"
import {
  testApp,
  createAuthenticatedUser,
  cleanDatabase,
  closeDatabase,
} from "./setup.js"

describe("Agent GitHub Link API", () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await closeDatabase()
  })

  it("POST /api/agents/github-link with valid GitHub URL fetches and compiles agent", async () => {
    const { cookies } = await createAuthenticatedUser()

    // Mock fetch to simulate GitHub raw content
    const originalFetch = globalThis.fetch
    const mockFetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString()
      if (urlStr.includes("raw.githubusercontent.com")) {
        return new Response(
          'export function move(state: unknown): string { return "up"; }',
          { status: 200, headers: { "content-length": "55" } }
        )
      }
      return originalFetch(url)
    }) as typeof fetch
    globalThis.fetch = mockFetch

    try {
      const res = await testApp.request("/api/agents/github-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies,
        },
        body: JSON.stringify({
          name: "GitHub Agent",
          repoUrl: "https://github.com/testuser/testrepo",
          filePath: "src/agent.ts",
        }),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.name).toBe("GitHub Agent")
      expect(body.data.sourceType).toBe("github")
      expect(body.data.sourceUrl).toContain("github.com")
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it("POST /api/agents/github-link with invalid URL returns 400", async () => {
    const { cookies } = await createAuthenticatedUser()

    const res = await testApp.request("/api/agents/github-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({
        name: "Bad Link",
        repoUrl: "https://not-github.com/test/repo",
        filePath: "agent.ts",
      }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
