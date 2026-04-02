import { Hono } from "hono"
import type { WSContext } from "hono/ws"

type UpgradeWebSocket = (
  handler: (c: unknown) => {
    onOpen?: (evt: Event, ws: WSContext) => void
    onMessage?: (evt: MessageEvent, ws: WSContext) => void
    onClose?: (evt: CloseEvent, ws: WSContext) => void
    onError?: (evt: Event, ws: WSContext) => void
  }
) => (c: unknown) => Response | Promise<Response>

/**
 * Creates spectate routes with WebSocket support.
 * Each WebSocket connection subscribes to a Redis channel for live match frames.
 */
export function createSpectateRoutes(
  upgradeWebSocket: UpgradeWebSocket
): Hono {
  const router = new Hono()

  router.get(
    "/matches/:matchId/spectate",
    upgradeWebSocket((c) => {
      const matchId = (c as { req: { param: (k: string) => string } }).req.param("matchId")
      let subscriber: { unsubscribe: (channel: string) => Promise<unknown>; quit: () => Promise<unknown> } | null = null

      return {
        onOpen: async (_evt: Event, ws: WSContext) => {
          const redisUrl = process.env.REDIS_URL
          if (!redisUrl) {
            ws.send(
              JSON.stringify({
                type: "error",
                data: { message: "Live spectating unavailable (no Redis)" },
              })
            )
            return
          }

          try {
            const { default: Redis } = await import("ioredis")
            const sub = new Redis(redisUrl)
            subscriber = sub

            const channel = `match:${matchId}`

            sub.on("message", (ch: string, message: string) => {
              if (ch === channel) {
                ws.send(message)
              }
            })

            await sub.subscribe(channel)

            ws.send(
              JSON.stringify({
                type: "subscribed",
                data: { matchId, channel },
              })
            )
          } catch {
            ws.send(
              JSON.stringify({
                type: "error",
                data: { message: "Failed to connect to live stream" },
              })
            )
          }
        },

        onMessage: () => {
          // Client commands not implemented yet -- ignore
        },

        onClose: async () => {
          if (subscriber) {
            try {
              await subscriber.unsubscribe(`match:${matchId}`)
              await subscriber.quit()
            } catch {
              // Best-effort cleanup
            }
            subscriber = null
          }
        },

        onError: async () => {
          if (subscriber) {
            try {
              await subscriber.unsubscribe(`match:${matchId}`)
              await subscriber.quit()
            } catch {
              // Best-effort cleanup
            }
            subscriber = null
          }
        },
      }
    })
  )

  return router
}
