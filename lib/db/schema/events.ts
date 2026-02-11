import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  integer,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { calendars } from "./calendars";

// Enum for event status
export const eventStatusEnum = pgEnum("event_status", [
  "confirmed",
  "tentative",
  "cancelled",
]);

// Calendar events
export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  externalId: text("external_id"), // ID from external provider
  title: text("title").notNull().default("(Geen titel)"),
  description: text("description"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  isAllDay: boolean("is_all_day").notNull().default(false),
  location: text("location"),
  status: eventStatusEnum("status").notNull().default("confirmed"),
  timezone: text("timezone").default("Europe/Amsterdam"),
  etag: text("etag"), // CalDAV etag for sync
  icsData: text("ics_data"), // Raw ICS data for CalDAV
  icsUid: text("ics_uid"), // ICS UID for CalDAV matching
  isRecurring: boolean("is_recurring").notNull().default(false),
  color: text("color"), // Override color (null = use calendar color)
  url: text("url"), // Conference/meeting URL
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  version: integer("version").notNull().default(1), // Version for optimistic locking
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // PERFORMANCE: Most critical index - used in every event query
  calendarIdIdx: index("events_calendar_id_idx").on(table.calendarId),
  // PERFORMANCE: Index on time range for efficient date-based queries
  startTimeIdx: index("events_start_time_idx").on(table.startTime),
  endTimeIdx: index("events_end_time_idx").on(table.endTime),
  // PERFORMANCE: Composite index for common query pattern (calendar + time range)
  calendarStartIdx: index("events_calendar_start_idx").on(table.calendarId, table.startTime),
  // PERFORMANCE: Index on icsUid for cross-calendar deduplication
  icsUidIdx: index("events_ics_uid_idx").on(table.icsUid),
  // PERFORMANCE: Index on externalId for deduplication
  externalIdIdx: index("events_external_id_idx").on(table.externalId),
}));

// Recurrence rules for recurring events
export const eventRecurrences = pgTable("event_recurrences", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  rrule: text("rrule").notNull(), // RFC 5545 RRULE string
  recurUntil: timestamp("recur_until", { withTimezone: true }), // End date of recurrence
  recurCount: integer("recur_count"), // Number of occurrences
  exDates: jsonb("ex_dates").$type<string[]>(), // Excluded dates (ISO strings)
}, (table) => ({
  // PERFORMANCE: Index on eventId for fast lookup (used in events API LEFT JOIN)
  eventIdIdx: index("event_recurrences_event_id_idx").on(table.eventId),
}));

// Individual instances of recurring events (with possible overrides)
export const eventInstances = pgTable("event_instances", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  originalStart: timestamp("original_start", { withTimezone: true }).notNull(), // Original scheduled start
  startTime: timestamp("start_time", { withTimezone: true }).notNull(), // Actual start (may differ if moved)
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  isCancelled: boolean("is_cancelled").notNull().default(false),
  overrides: jsonb("overrides").$type<{
    title?: string;
    description?: string;
    location?: string;
    color?: string;
  }>(),
}, (table) => ({
  // PERFORMANCE: Index on eventId for fast lookup
  eventIdIdx: index("event_instances_event_id_idx").on(table.eventId),
  // PERFORMANCE: Index on originalStart for recurring event instance queries
  originalStartIdx: index("event_instances_original_start_idx").on(table.originalStart),
}));

// Relations
export const eventsRelations = relations(events, ({ one, many }) => ({
  calendar: one(calendars, {
    fields: [events.calendarId],
    references: [calendars.id],
  }),
  recurrence: one(eventRecurrences, {
    fields: [events.id],
    references: [eventRecurrences.eventId],
  }),
  instances: many(eventInstances),
}));

export const eventRecurrencesRelations = relations(
  eventRecurrences,
  ({ one }) => ({
    event: one(events, {
      fields: [eventRecurrences.eventId],
      references: [events.id],
    }),
  })
);

export const eventInstancesRelations = relations(
  eventInstances,
  ({ one }) => ({
    event: one(events, {
      fields: [eventInstances.eventId],
      references: [events.id],
    }),
  })
);
