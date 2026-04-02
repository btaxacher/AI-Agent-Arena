import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { testApp, cleanDatabase, closeDatabase } from "./setup.js"

describe("GitHub OAuth", () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await closeDatabase()
  })

  it("GET /api/auth/sign-in/social generates GitHub OAuth redirect URL", async () => {
    const res = await testApp.request("/api/auth/sign-in/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "github",
        callbackURL: "http://localhost:3000/dashboard",
      }),
    })

    // Better Auth should redirect or return a URL to GitHub OAuth
    // It may return 200 with a redirect URL or 302 redirect
    if (res.status === 302 || res.status === 301) {
      const location = res.headers.get("Location") ?? ""
      expect(location).toContain("github.com")
      expect(location).toContain("test-github-client-id")
    } else {
      expect(res.status).toBe(200)
      const body = await res.json()
      // The response should contain a URL or redirect info
      const url = body.url ?? body.redirect ?? ""
      expect(url).toContain("github.com")
    }
  })
})
