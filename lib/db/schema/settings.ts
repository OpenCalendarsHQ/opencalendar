import { pgTable, text, boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * User settings table for cross-device sync
 */
export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),

  // Basic display
  weekStartsOn: integer("week_starts_on").notNull().default(1), // 0 = Sunday, 1 = Monday
  timeFormat: text("time_format").notNull().default("24h"), // "24h" | "12h"
  timezone: text("timezone").notNull().default("Europe/Amsterdam"),
  showWeekNumbers: boolean("show_week_numbers").notNull().default(false),
  defaultView: text("default_view").notNull().default("week"), // "day" | "week" | "month"
  defaultEventDuration: integer("default_event_duration").notNull().default(60), // minutes
  showDeclinedEvents: boolean("show_declined_events").notNull().default(false),

  // Theme & appearance
  theme: text("theme").notNull().default("auto"), // "light" | "dark" | "auto"
  colorScheme: text("color_scheme").notNull().default("default"), // "default" | "blue" | "purple" | "green" | "orange"
  compactMode: boolean("compact_mode").notNull().default(false),

  // Working hours & time slots
  showWorkingHours: boolean("show_working_hours").notNull().default(true),
  workingHoursStart: integer("working_hours_start").notNull().default(9), // 0-23
  workingHoursEnd: integer("working_hours_end").notNull().default(17), // 0-23
  dayStartHour: integer("day_start_hour").notNull().default(6), // 0-23
  dayEndHour: integer("day_end_hour").notNull().default(22), // 0-23
  timeSlotInterval: integer("time_slot_interval").notNull().default(30), // 15 | 30 | 60
  showWeekends: boolean("show_weekends").notNull().default(true),

  // Calendar preferences
  defaultCalendarId: uuid("default_calendar_id"), // nullable
  eventColorSource: text("event_color_source").notNull().default("calendar"), // "calendar" | "event"
  showMiniCalendar: boolean("show_mini_calendar").notNull().default(true),

  // Notifications (for later)
  defaultReminders: text("default_reminders").notNull().default("[15,60]"), // JSON array of minutes
  enableNotifications: boolean("enable_notifications").notNull().default(false),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
