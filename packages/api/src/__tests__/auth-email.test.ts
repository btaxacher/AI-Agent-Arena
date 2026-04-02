import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { testApp, cleanDatabase, closeDatabase } from "./setup.js"

describe("Email Authentication", () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await closeDatabase()
  })

  it("POST /api/auth/sign-up/email creates a user and returns 200", async () => {
    const res = await testApp.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "email-new@example.com",
        password: "securepass123",
        name: "New User",
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user).toBeDefined()
    expect(body.user.email).toBe("email-new@example.com")
    expect(body.user.name).toBe("New User")
  })

  it("POST /api/auth/sign-in/email with valid credentials returns 200 with session", async () => {
    // First sign up
    await testApp.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "email-user@example.com",
        password: "securepass123",
        name: "Test User",
      }),
    })

    // Then sign in
    const res = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "email-user@example.com",
        password: "securepass123",
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    // Better Auth sign-in returns { user, session } or { token, user }
    expect(body.user ?? body.token).toBeDefined()

    // Should set session cookie
    const setCookies = res.headers.getSetCookie()
    expect(setCookies.length).toBeGreaterThan(0)
  })

  it("POST /api/auth/sign-in/email with wrong password returns error", async () => {
    // First sign up
    await testApp.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "email-user@example.com",
        password: "securepass123",
        name: "Test User",
      }),
    })

    // Try sign in with wrong password
    const res = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "email-user@example.com",
        password: "wrongpassword",
      }),
    })

    // Better Auth returns 401 or 400 for invalid credentials
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
