// Shared types used across the app

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
  calendarId: string;
  isAllDay: boolean;
  location?: string;
  description?: string;
  status?: string;
  isRecurring?: boolean;
  rrule?: string | null;
  exDates?: string[] | null;
  /** Set on multi-day segments that were split for per-day rendering. Points to the real event ID. */
  originalId?: string;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  priority: "low" | "medium" | "high";
  color: string;
  listId: string;
  createdAt: Date;
  order: number;
}

export interface TodoList {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface CalendarItem {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  isReadOnly: boolean;
}

export interface CalendarGroup {
  id: string;
  provider: "google" | "icloud" | "local";
  email: string;
  calendars: CalendarItem[];
}

export type CalendarViewType = "day" | "week" | "month" | "year";

export type SidebarTab = "calendars" | "todos";
