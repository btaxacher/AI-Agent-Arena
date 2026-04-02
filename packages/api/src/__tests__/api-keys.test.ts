import { describe, it, expect, beforeEach, afterAll } from "vitest"
import {
  testApp,
  testAuth,
  createAuthenticatedUser,
  cleanDatabase,
  closeDatabase,
} from "./setup.js"

describe("API Key Management", () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await closeDatabase()
  })

  it("POST /api/auth/api-key/create with valid session returns API key", async () => {
    const { cookies } = await createAuthenticatedUser(
      "apikey-create@example.com"
    )

    const res = await testApp.request("/api/auth/api-key/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({ name: "Test Key" }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.key).toBeDefined()
    expect(typeof body.key).toBe("string")
    expect(body.key.length).toBeGreaterThan(0)
  })

  it("Protected endpoint with valid API key header returns 200", async () => {
    const { cookies } = await createAuthenticatedUser(
      "apikey-verify@example.com"
    )

    // Create an API key
    const createRes = await testApp.request("/api/auth/api-key/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({ name: "Auth Key" }),
    })

    const { key } = await createRes.json()

    // Use the API key to access a protected endpoint
    const res = await testApp.request("/api/protected", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.userId).toBeDefined()
  })

  it("POST /api/auth/api-key/create without session returns error", async () => {
    const res = await testApp.request("/api/auth/api-key/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Key" }),
    })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
