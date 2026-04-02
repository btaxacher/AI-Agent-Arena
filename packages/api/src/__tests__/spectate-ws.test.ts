import { describe, it, expect } from "vitest"
import { createSpectateRoutes } from "../routes/spectate.js"

describe("spectate WebSocket routes", () => {
  it("createSpectateRoutes returns a Hono router", () => {
    // Mock upgradeWebSocket -- just returns a handler that calls the factory
    const mockUpgrade = (() => {
      return () => new Response("upgrade mock", { status: 101 })
    }) as unknown as Parameters<typeof createSpectateRoutes>[0]

    const router = createSpectateRoutes(mockUpgrade)
    expect(router).toBeDefined()
    expect(router.routes).toBeDefined()
  })

  it("spectate route is registered at /matches/:matchId/spectate", () => {
    const mockUpgrade = ((handler: unknown) => {
      return handler
    }) as unknown as Parameters<typeof createSpectateRoutes>[0]

    const router = createSpectateRoutes(mockUpgrade)

    // Verify the route exists in the router's route table
    const routes = router.routes
    const spectateRoute = routes.find(
      (r) =>
        r.path === "/matches/:matchId/spectate" && r.method === "GET"
    )
    expect(spectateRoute).toBeDefined()
  })

  it("WebSocket handler factory returns handlers with expected lifecycle methods", () => {
    let capturedFactory: ((c: unknown) => unknown) | null = null

    const mockUpgrade = ((factory: (c: unknown) => unknown) => {
      capturedFactory = factory
      return () => new Response("upgrade", { status: 101 })
    }) as unknown as Parameters<typeof createSpectateRoutes>[0]

    createSpectateRoutes(mockUpgrade)

    expect(capturedFactory).not.toBeNull()

    // Call factory with a mock context
    const mockContext = {
      req: { param: (k: string) => (k === "matchId" ? "test-match-123" : "") },
    }
    const handlers = capturedFactory!(mockContext) as Record<string, unknown>

    expect(typeof handlers.onOpen).toBe("function")
    expect(typeof handlers.onMessage).toBe("function")
    expect(typeof handlers.onClose).toBe("function")
    expect(typeof handlers.onError).toBe("function")
  })
})
