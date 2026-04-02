import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { serve } from "@hono/node-server"
import { createNodeWebSocket } from "@hono/node-ws"
import { authRoutes } from "./routes/auth.js"
import { agentRoutes } from "./routes/agents.js"
import { matchRoutes } from "./routes/matches.js"
import { createSpectateRoutes } from "./routes/spectate.js"

const app = new Hono()

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

app.use("*", logger())

// CORS only on API routes -- WebSocket routes must not have CORS headers
app.use(
  "/api/*",
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  })
)

app.get("/health", (c) => {
  return c.json({ status: "ok" })
})

app.route("/", authRoutes)
app.route("/api", agentRoutes)
app.route("/api", matchRoutes)
app.route("/ws", createSpectateRoutes(upgradeWebSocket))

const port = Number(process.env.PORT ?? 3001)

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`)
})

injectWebSocket(server)

export default app
