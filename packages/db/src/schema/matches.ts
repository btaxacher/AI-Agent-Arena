import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core"
import { nanoid } from "nanoid"
import { user } from "./users.js"
import { agents } from "./agents.js"

export const matches = pgTable("matches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  discipline: text("discipline").notNull().default("snake"),
  seed: text("seed").notNull(),
  config: jsonb("config"),
  status: text("status").notNull().default("queued"),
  score: integer("score"),
  ticksPlayed: integer("ticks_played"),
  terminationReason: text("termination_reason"),
  frames: jsonb("frames"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
})
