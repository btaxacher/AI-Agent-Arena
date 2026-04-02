import type { Context, Next } from "hono"
import { auth } from "../auth.js"

export interface AuthVariables {
  user: {
    id: string
    name: string | null
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: Date
    updatedAt: Date
  }
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date
    updatedAt: Date
  }
}

export async function requireAuth(
  c: Context<{ Variables: AuthVariables }>,
  next: Next
): Promise<Response | void> {
  // Try session cookie first
  const sessionResult = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (sessionResult) {
    c.set("user", sessionResult.user as AuthVariables["user"])
    c.set("session", sessionResult.session as AuthVariables["session"])
    return next()
  }

  // Try API key from Authorization header
  const authHeader = c.req.header("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice(7)
    try {
      const keyResult = await auth.api.verifyApiKey({
        body: { key },
      })
      const userId =
            keyResult?.key?.userId ?? keyResult?.key?.referenceId
      if (keyResult?.valid && userId) {
        // For API key auth, create a minimal user context
        c.set("user", { id: userId } as AuthVariables["user"])
        c.set("session", { userId } as AuthVariables["session"])
        return next()
      }
    } catch {
      // API key verification failed, fall through to 401
    }
  }

  return c.json({ success: false, error: "Unauthorized" }, 401)
}
