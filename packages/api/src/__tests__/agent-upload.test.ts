import { describe, it, expect, beforeEach, afterAll } from "vitest"
import {
  testApp,
  testDb,
  createAuthenticatedUser,
  cleanDatabase,
  closeDatabase,
} from "./setup.js"

describe("Agent Upload API", () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await closeDatabase()
  })

  it("POST /api/agents/upload with valid TS code returns 201 with agent metadata", async () => {
    const { cookies } = await createAuthenticatedUser()

    const res = await testApp.request("/api/agents/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({
        name: "Test Agent",
        description: "A test agent",
        code: 'export function move(state: unknown): string { return "up"; }',
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe("Test Agent")
    expect(body.data.sourceType).toBe("upload")
    expect(body.data.id).toBeDefined()
    expect(body.data.version).toBe(1)
    expect(body.data.isActive).toBe(true)
  })

  it("POST /api/agents/upload with invalid TS syntax returns 400", async () => {
    const { cookies } = await createAuthenticatedUser()

    const res = await testApp.request("/api/agents/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({
        name: "Bad Agent",
        code: "invalid {{{{ typescript syntax",
      }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain("compilation failed")
  })

  it("POST /api/agents/upload without auth returns 401", async () => {
    const res = await testApp.request("/api/agents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Unauth Agent",
        code: 'export function move() { return "up"; }',
      }),
    })

    expect(res.status).toBe(401)
  })

  it("GET /api/agents returns list of user's agents only", async () => {
    const { cookies: cookies1 } = await createAuthenticatedUser(
      "user1@test.com",
      "password123",
      "User 1"
    )
    const { cookies: cookies2 } = await createAuthenticatedUser(
      "user2@test.com",
      "password123",
      "User 2"
    )

    // User 1 uploads an agent
    await testApp.request("/api/agents/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies1,
      },
      body: JSON.stringify({
        name: "User1 Agent",
        code: 'export function move() { return "up"; }',
      }),
    })

    // User 2 uploads an agent
    await testApp.request("/api/agents/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies2,
      },
      body: JSON.stringify({
        name: "User2 Agent",
        code: 'export function move() { return "down"; }',
      }),
    })

    // User 1 should only see their agent
    const res = await testApp.request("/api/agents", {
      headers: { Cookie: cookies1 },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe("User1 Agent")
  })

  it("GET /api/agents/:id returns single agent metadata", async () => {
    const { cookies } = await createAuthenticatedUser()

    const uploadRes = await testApp.request("/api/agents/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies,
      },
      body: JSON.stringify({
        name: "My Agent",
        code: 'export function move() { return "left"; }',
      }),
    })

    const uploadBody = await uploadRes.json()
    const agentId = uploadBody.data.id

    const res = await testApp.request(`/api/agents/${agentId}`, {
      headers: { Cookie: cookies },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(agentId)
    expect(body.data.name).toBe("My Agent")
  })

  it("compileAgentCode compiles valid TypeScript to JavaScript", async () => {
    const { compileAgentCode } = await import(
      "../services/agent-compiler.js"
    )
    const result = await compileAgentCode(
      "const x: number = 1; export function move() { return x; }"
    )
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
    // Compiled JS should not contain TypeScript type annotations
    expect(result).not.toContain(": number")
  })

  it("compileAgentCode throws on invalid TypeScript", async () => {
    const { compileAgentCode } = await import(
      "../services/agent-compiler.js"
    )
    await expect(
      compileAgentCode("invalid {{{{ typescript")
    ).rejects.toThrow()
  })
})
