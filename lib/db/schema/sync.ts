import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { calendarAccounts, calendars } from "./calendars";

// Enum for sync status
export const syncStatusEnum = pgEnum("sync_status", [
  "idle",
  "syncing",
  "error",
  "success",
]);

// Sync state tracking per calendar
export const syncStates = pgTable("sync_states", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => calendarAccounts.id, { onDelete: "cascade" }),
  calendarId: uuid("calendar_id").references(() => calendars.id, {
    onDelete: "cascade",
  }),
  syncToken: text("sync_token"), // Google Calendar sync token
  ctag: text("ctag"), // CalDAV collection tag
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: syncStatusEnum("sync_status").notNull().default("idle"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const syncStatesRelations = relations(syncStates, ({ one }) => ({
  account: one(calendarAccounts, {
    fields: [syncStates.accountId],
    references: [calendarAccounts.id],
  }),
  calendar: one(calendars, {
    fields: [syncStates.calendarId],
    references: [calendars.id],
  }),
}));
