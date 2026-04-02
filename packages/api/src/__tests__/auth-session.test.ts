import { describe, it, expect, beforeEach, afterAll } from "vitest"
import {
  testApp,
  createAuthenticatedUser,
  cleanDatabase,
  closeDatabase,
} from "./setup.js"

describe("Session Management", () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await closeDatabase()
  })

  it("GET /api/auth/get-session with valid session cookie returns user data", async () => {
    const { cookies } = await createAuthenticatedUser(
      "session-get@example.com"
    )

    const res = await testApp.request("/api/auth/get-session", {
      method: "GET",
      headers: {
        Cookie: cookies,
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user).toBeDefined()
    expect(body.user.email).toBe("session-get@example.com")
    expect(body.session).toBeDefined()
  })

  it("GET /api/auth/get-session without cookie returns no session", async () => {
    const res = await testApp.request("/api/auth/get-session", {
      method: "GET",
    })

    // Better Auth returns 200 with null body or 401 when no session
    if (res.status === 200) {
      const body = await res.json()
      // Body is null or has no user
      expect(body === null || body?.user === undefined || body?.user === null).toBe(true)
    } else {
      expect(res.status).toBe(401)
    }
  })

  it("Protected endpoint without auth returns 401", async () => {
    const res = await testApp.request("/api/protected", {
      method: "GET",
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe("Unauthorized")
  })

  it("Protected endpoint with valid session returns 200", async () => {
    const { cookies } = await createAuthenticatedUser(
      "session-protected@example.com"
    )

    const res = await testApp.request("/api/protected", {
      method: "GET",
      headers: {
        Cookie: cookies,
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.userId).toBeDefined()
  })
})
