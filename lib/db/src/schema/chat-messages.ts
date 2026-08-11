import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// context_type: 'meeting' | 'project'
// context_id: the meeting or project id
export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  contextType: text("context_type").notNull(), // 'meeting' | 'project'
  contextId: integer("context_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ChatMessage = typeof chatMessagesTable.$inferSelect;

export const ChatMessageSchema = z.object({
  id: z.number(),
  contextType: z.string(),
  contextId: z.number(),
  role: z.string(),
  content: z.string(),
  createdAt: z.string().or(z.date()),
});
