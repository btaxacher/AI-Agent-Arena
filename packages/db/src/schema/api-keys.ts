import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core"
import { user } from "./users.js"

export const apikey = pgTable("apikey", {
  id: text("id").primaryKey(),
  configId: text("config_id").notNull().default("default"),
  name: text("name"),
  start: text("start"),
  referenceId: text("reference_id"),
  prefix: text("prefix"),
  key: text("key").notNull(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  refillInterval: integer("refill_interval"),
  refillAmount: integer("refill_amount"),
  lastRefillAt: timestamp("last_refill_at"),
  enabled: boolean("enabled").default(true),
  rateLimitEnabled: boolean("rate_limit_enabled").default(true),
  rateLimitTimeWindow: integer("rate_limit_time_window").default(86400000),
  rateLimitMax: integer("rate_limit_max").default(10),
  requestCount: integer("request_count").default(0),
  remaining: integer("remaining"),
  lastRequest: timestamp("last_request"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  permissions: text("permissions"),
  metadata: text("metadata"),
})
