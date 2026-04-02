import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { serve } from "@hono/node-server"
import { authRoutes } from "./routes/auth.js"
import { agentRoutes } from "./routes/agents.js"
import { matchRoutes } from "./routes/matches.js"

const app = new Hono()

app.use("*", logger())
app.use(
  "*",
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

const port = Number(process.env.PORT ?? 3001)

serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`)
})

export default app
