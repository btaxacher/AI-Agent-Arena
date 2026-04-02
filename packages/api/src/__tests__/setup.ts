import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { apiKey } from "@better-auth/api-key"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "@repo/db/schema"
import { sql } from "drizzle-orm"
import { Hono } from "hono"
import { cors } from "hono/cors"

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/ai_agent_arena"

const client = postgres(databaseUrl)
const testDb = drizzle(client, { schema })

// Create a test auth instance
export const testAuth = betterAuth({
  database: drizzleAdapter(testDb, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      apikey: schema.apikey,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: "test-github-client-id",
      clientSecret: "test-github-client-secret",
    },
  },
  plugins: [apiKey()],
  trustedOrigins: ["http://localhost:3000"],
  secret: "test-secret-key-for-better-auth-testing-only",
  baseURL: "http://localhost:3001",
})

// Create a test Hono app
function createTestApp() {
  const app = new Hono()

  app.use(
    "*",
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  )

  app.get("/health", (c) => c.json({ status: "ok" }))

  app.all("/api/auth/*", async (c) => {
    return testAuth.handler(c.req.raw)
  })

  // Protected test endpoint
  app.get("/api/protected", async (c) => {
    const sessionResult = await testAuth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (sessionResult) {
      return c.json({ success: true, data: { userId: sessionResult.user.id } })
    }

    // Try API key
    const authHeader = c.req.header("Authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const key = authHeader.slice(7)
      try {
        const keyResult = await testAuth.api.verifyApiKey({
          body: { key },
        })
        if (keyResult?.valid) {
          const userId =
            keyResult.key?.userId ??
            keyResult.key?.referenceId ??
            keyResult.key?.id ??
            ""
          return c.json({
            success: true,
            data: { userId },
          })
        }
      } catch {
        // fall through
      }
    }

    return c.json({ success: false, error: "Unauthorized" }, 401)
  })

  return app
}

export const testApp = createTestApp()

// Helper: sign up a user and return cookies for authenticated requests
export async function createAuthenticatedUser(
  email = "test@example.com",
  password = "testpassword123",
  name = "Test User"
): Promise<{ cookies: string; userId: string }> {
  // Sign up
  const signUpRes = await testApp.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  })

  if (!signUpRes.ok) {
    const err = await signUpRes.text()
    throw new Error(`Sign up failed: ${signUpRes.status} ${err}`)
  }

  const signUpBody = await signUpRes.json()

  // Extract set-cookie headers
  const cookies = signUpRes.headers
    .getSetCookie()
    .map((c: string) => c.split(";")[0])
    .join("; ")

  return {
    cookies,
    userId: signUpBody.user?.id ?? signUpBody.id ?? "",
  }
}

// Clean up tables before each test - use TRUNCATE CASCADE for safety
export async function cleanDatabase() {
  await testDb.execute(
    sql`TRUNCATE "apikey", "verification", "account", "session", "user" CASCADE`
  )
}

// Close DB connection
export async function closeDatabase() {
  await client.end()
}
