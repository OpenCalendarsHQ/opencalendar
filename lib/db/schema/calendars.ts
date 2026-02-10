import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Enum for calendar providers
export const calendarProviderEnum = pgEnum("calendar_provider", [
  "google",
  "icloud",
  "microsoft",
  "caldav",
  "local",
]);

// Calendar accounts (connected providers)
export const calendarAccounts = pgTable("calendar_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: calendarProviderEnum("provider").notNull(),
  email: text("email").notNull(),
  accessToken: text("access_token"), // Encrypted OAuth token (Google) or app password (iCloud)
  refreshToken: text("refresh_token"), // Google OAuth refresh token
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  providerData: jsonb("provider_data").$type<Record<string, unknown>>(), // Extra provider-specific data
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // PERFORMANCE: Index on userId for fast lookup by user (used in every calendar query)
  userIdIdx: index("calendar_accounts_user_id_idx").on(table.userId),
  // PERFORMANCE: Composite unique constraint on userId + provider (one account per provider per user)
  userProviderUnique: uniqueIndex("calendar_accounts_user_provider_unique").on(table.userId, table.provider),
}));

// Individual calendars within an account
export const calendars = pgTable("calendars", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => calendarAccounts.id, { onDelete: "cascade" }),
  externalId: text("external_id"), // ID from the external provider
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#3b82f6"), // Default blue
  isVisible: boolean("is_visible").notNull().default(true),
  isReadOnly: boolean("is_read_only").notNull().default(false),
  isPrimary: boolean("is_primary").notNull().default(false),
  timezone: text("timezone").default("Europe/Amsterdam"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // PERFORMANCE: Index on accountId for fast lookup by account (used in calendar queries)
  accountIdIdx: index("calendars_account_id_idx").on(table.accountId),
}));

// Relations
export const calendarAccountsRelations = relations(
  calendarAccounts,
  ({ one, many }) => ({
    user: one(user, {
      fields: [calendarAccounts.userId],
      references: [user.id],
    }),
    calendars: many(calendars),
  })
);

export const calendarsRelations = relations(calendars, ({ one }) => ({
  account: one(calendarAccounts, {
    fields: [calendars.accountId],
    references: [calendarAccounts.id],
  }),
}));
