import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const lifeSaves = sqliteTable("life_saves", {
  userEmail: text("user_email").primaryKey(),
  displayName: text("display_name").notNull(),
  saveData: text("save_data").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
