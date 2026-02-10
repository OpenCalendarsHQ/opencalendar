// Shared types for the desktop app

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface Calendar {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  isReadOnly: boolean;
  isPrimary: boolean;
}

export interface CalendarAccount {
  id: string;
  provider: "google" | "icloud" | "microsoft" | "local";
  email: string;
  lastSyncAt: Date | null;
  isActive: boolean;
  calendars: Calendar[];
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  color?: string;
  calendarId: string;
  status?: string;
  isRecurring: boolean;
  rrule?: string | null;
  exDates?: string[] | null;
}

// Alias for components that use CalendarEvent
export type CalendarEvent = Event & {
  color: string; // Make color required
  /** Set on multi-day segments that were split for per-day rendering. Points to the real event ID. */
  originalId?: string;
};

export interface CalendarItem {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  isReadOnly: boolean;
}

export interface CalendarGroup {
  id: string;
  provider: "google" | "icloud" | "microsoft" | "caldav" | "local";
  email: string;
  calendars: CalendarItem[];
}

export type CalendarViewType = "day" | "week" | "month" | "year";

export interface Settings {
  id?: string;
  userId: string;
  theme: "light" | "dark" | "system";
  primaryColor: string;
  weekStartsOn: 0 | 1 | 6; // 0 = Sunday, 1 = Monday, 6 = Saturday
  timeFormat: "12h" | "24h";
  defaultView: "day" | "week" | "month";
  workingHoursStart: number; // 0-23
  workingHoursEnd: number; // 0-23
  showWeekNumbers: boolean;
  compactMode: boolean;
  defaultReminders: number[]; // minutes before event
  createdAt?: Date;
  updatedAt?: Date;
}
