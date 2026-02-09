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
import { events } from "./events";

// Enum for task providers
export const taskProviderEnum = pgEnum("task_provider", [
  "notion",
  "github",
  "manual",
]);

// Task provider accounts (Notion, GitHub)
export const taskProviders = pgTable("task_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: taskProviderEnum("provider").notNull(),
  name: text("name").notNull(), // User-friendly name (e.g., "Work GitHub", "Personal Notion")
  accessToken: text("access_token"), // Encrypted OAuth token
  refreshToken: text("refresh_token"), // OAuth refresh token (GitHub)
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  providerData: jsonb("provider_data").$type<{
    // Notion-specific
    workspaceId?: string;
    workspaceName?: string;
    workspaceIcon?: string;
    botId?: string;
    databaseId?: string; // Selected Notion database
    // GitHub-specific
    username?: string;
    avatarUrl?: string;
    scope?: string;
    repositories?: string[]; // Selected repositories to sync
  }>(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("task_providers_user_id_idx").on(table.userId),
  userProviderUnique: uniqueIndex("task_providers_user_provider_unique").on(table.userId, table.provider),
}));

// Tasks from Notion or GitHub
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => taskProviders.id, { onDelete: "cascade" }),
  externalId: text("external_id"), // Notion page ID or GitHub issue number (NULL for manual tasks)
  externalUrl: text("external_url"), // Link to original task/issue (NULL for manual tasks)
  title: text("title").notNull(),
  description: text("description"),
  status: text("status"), // Notion status or GitHub state (open, closed, etc.)
  priority: text("priority"), // If available
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  labels: jsonb("labels").$type<string[]>(), // GitHub labels or Notion tags
  assignees: jsonb("assignees").$type<string[]>(), // Usernames or names

  // Scheduling information
  scheduledEventId: uuid("scheduled_event_id").references(() => events.id, { onDelete: "set null" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }), // When it was scheduled

  // Metadata
  providerData: jsonb("provider_data").$type<Record<string, unknown>>(), // Extra provider-specific data
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  providerIdIdx: index("tasks_provider_id_idx").on(table.providerId),
  externalIdIdx: index("tasks_external_id_idx").on(table.externalId),
  dueDateIdx: index("tasks_due_date_idx").on(table.dueDate),
  scheduledEventIdIdx: index("tasks_scheduled_event_id_idx").on(table.scheduledEventId),
  // Unique constraint: one task per external ID per provider
  providerExternalUnique: uniqueIndex("tasks_provider_external_unique").on(table.providerId, table.externalId),
}));

// Relations
export const taskProvidersRelations = relations(
  taskProviders,
  ({ one, many }) => ({
    user: one(user, {
      fields: [taskProviders.userId],
      references: [user.id],
    }),
    tasks: many(tasks),
  })
);

export const tasksRelations = relations(tasks, ({ one }) => ({
  provider: one(taskProviders, {
    fields: [tasks.providerId],
    references: [taskProviders.id],
  }),
  scheduledEvent: one(events, {
    fields: [tasks.scheduledEventId],
    references: [events.id],
  }),
}));
