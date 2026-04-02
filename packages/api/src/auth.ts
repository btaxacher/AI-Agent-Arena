import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { apiKey } from "@better-auth/api-key"
import { db } from "@repo/db"
import * as schema from "@repo/db/schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
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
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  },
  plugins: [apiKey()],
  trustedOrigins: [process.env.FRONTEND_URL ?? "http://localhost:3000"],
  secret: process.env.BETTER_AUTH_SECRET,
})
