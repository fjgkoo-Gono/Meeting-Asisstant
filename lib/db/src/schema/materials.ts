import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { meetingsTable } from "./meetings";

export const materialsTable = pgTable("materials", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetingsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // photo | image | pdf | excel | text
  filename: text("filename").notNull(), // stored filename on disk
  originalName: text("original_name").notNull(),
  extractedText: text("extracted_text"),
  status: text("status").notNull().default("processing"), // processing | ready | error
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMaterialSchema = createInsertSchema(materialsTable).omit({ id: true, createdAt: true });
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materialsTable.$inferSelect;
