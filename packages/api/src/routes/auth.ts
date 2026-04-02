import { Hono } from "hono"
import { auth } from "../auth.js"

export const authRoutes = new Hono()

authRoutes.all("/api/auth/*", async (c) => {
  return auth.handler(c.req.raw)
})
