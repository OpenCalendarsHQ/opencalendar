import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  integer,
  pgEnum,
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
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Recurrence rules for recurring events
export const eventRecurrences = pgTable("event_recurrences", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  rrule: text("rrule").notNull(), // RFC 5545 RRULE string
  recurUntil: timestamp("recur_until"), // End date of recurrence
  recurCount: integer("recur_count"), // Number of occurrences
  exDates: jsonb("ex_dates").$type<string[]>(), // Excluded dates (ISO strings)
});

// Individual instances of recurring events (with possible overrides)
export const eventInstances = pgTable("event_instances", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  originalStart: timestamp("original_start").notNull(), // Original scheduled start
  startTime: timestamp("start_time").notNull(), // Actual start (may differ if moved)
  endTime: timestamp("end_time").notNull(),
  isCancelled: boolean("is_cancelled").notNull().default(false),
  overrides: jsonb("overrides").$type<{
    title?: string;
    description?: string;
    location?: string;
    color?: string;
  }>(),
});

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
