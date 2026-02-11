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
  language: text("language").notNull().default("nl"), // "nl" | "en"
  showWeekNumbers: boolean("show_week_numbers").notNull().default(false),
  defaultView: text("default_view").notNull().default("week"), // "day" | "week" | "month" | "year"
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

  // Event display customization
  eventBorderStyle: text("event_border_style").notNull().default("solid"), // "solid" | "dashed" | "dotted" | "none"
  eventBorderWidth: integer("event_border_width").notNull().default(3), // 1 | 2 | 3 | 4
  eventCornerRadius: integer("event_corner_radius").notNull().default(4), // 0 | 2 | 4 | 6 | 8 | 12
  eventOpacity: integer("event_opacity").notNull().default(100), // 60 | 70 | 80 | 90 | 100
  eventFontSize: text("event_font_size").notNull().default("sm"), // "xs" | "sm" | "base"
  eventPadding: text("event_padding").notNull().default("normal"), // "tight" | "normal" | "relaxed"
  showLocationIcon: boolean("show_location_icon").notNull().default(true),
  showTimeInCompact: boolean("show_time_in_compact").notNull().default(true),
  eventBackgroundStyle: text("event_background_style").notNull().default("solid"), // "solid" | "gradient" | "glass"
  eventShadow: text("event_shadow").notNull().default("none"), // "none" | "sm" | "md"
  showEventBorder: boolean("show_event_border").notNull().default(true),
  eventTitleWeight: text("event_title_weight").notNull().default("medium"), // "normal" | "medium" | "semibold" | "bold"
  eventTextAlignment: text("event_text_alignment").notNull().default("left"), // "left" | "center" | "right"

  // Notifications (for later)
  defaultReminders: text("default_reminders").notNull().default("[15,60]"), // JSON array of minutes
  enableNotifications: boolean("enable_notifications").notNull().default(false),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
