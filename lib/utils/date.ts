import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addDays,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
  differenceInMinutes,
  parseISO,
  getWeek,
} from "date-fns";
import { nl } from "date-fns/locale";

export {
  format,
  addDays,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
  differenceInMinutes,
  parseISO,
  getWeek,
  startOfWeek,
  endOfWeek,
};

export const locale = nl;

export function getWeekDays(date: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
  return eachDayOfInterval({ start, end });
}

export function getMonthDays(
  date: Date,
  weekStartsOn: 0 | 1 = 1
): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });
  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

export function formatTime(date: Date, use24h: boolean = true): string {
  return format(date, use24h ? "HH:mm" : "h:mm a", { locale: nl });
}

export function formatDateShort(date: Date): string {
  return format(date, "d MMM", { locale: nl });
}

export function formatDateFull(date: Date): string {
  return format(date, "EEEE d MMMM yyyy", { locale: nl });
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy", { locale: nl });
}

export function formatTodayDate(date: Date): string {
  return format(date, "EEEE d MMMM", { locale: nl });
}

export function formatWeekDay(date: Date): string {
  return format(date, "EEE", { locale: nl });
}

export function formatDayNumber(date: Date): string {
  return format(date, "d", { locale: nl });
}

/**
 * Get the top position (in pixels) for a time on the calendar grid.
 * Based on 60px per hour (configurable).
 */
export function getTimePosition(
  date: Date,
  hourHeight: number = 60
): number {
  const hours = getHours(date);
  const minutes = getMinutes(date);
  return hours * hourHeight + (minutes / 60) * hourHeight;
}

/**
 * Get the height of an event block based on its duration.
 */
export function getEventHeight(
  startDate: Date,
  endDate: Date,
  hourHeight: number = 60
): number {
  const minutes = differenceInMinutes(endDate, startDate);
  return Math.max((minutes / 60) * hourHeight, hourHeight / 4); // Minimum 15 min height
}

/**
 * Hours array for the time grid (0-23).
 */
export const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Generate a time label for an hour.
 */
export function getHourLabel(hour: number, use24h: boolean = true): string {
  if (use24h) {
    return `${hour.toString().padStart(2, "0")}:00`;
  }
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${period}`;
}

/**
 * Get the ISO 8601 week number for a date (Dutch/European standard).
 * Week 1 is the first week with Thursday in it.
 * Weeks always start on Monday (ISO 8601 standard).
 */
export function getWeekNumber(date: Date, weekStartsOn: 0 | 1 = 1): number {
  // ISO 8601 standard: week 1 is the first week with Thursday (day 4)
  // Always use Monday as start of week for ISO 8601 compliance (Dutch standard)
  return getWeek(date, {
    weekStartsOn: 1,
    firstWeekContainsDate: 4,
  });
}
