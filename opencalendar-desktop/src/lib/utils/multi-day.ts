import type { CalendarEvent } from "../types";

/**
 * Check if an event spans multiple calendar days.
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  const startDay = toDateKey(event.startTime);
  const endDay = toDateKey(event.endTime);
  return startDay !== endDay;
}

/**
 * Get date key (YYYY-MM-DD) for a date.
 */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Get all date keys a multi-day event spans.
 */
export function getEventDateKeys(event: CalendarEvent): string[] {
  const keys: string[] = [];
  const current = new Date(event.startTime);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(event.endTime);

  while (current <= endDate) {
    keys.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return keys;
}

/**
 * Check if an event is active on a given day (for all-day and multi-day events).
 */
export function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return event.startTime <= dayEnd && event.endTime >= dayStart;
}

/**
 * Split timed events into per-day segments for multi-day timed events.
 * Single-day events are returned unchanged.
 * Multi-day timed events get clipped to each day's boundaries.
 */
export function splitMultiDayTimedEvents(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const result: CalendarEvent[] = [];

  for (const event of events) {
    if (event.isAllDay) continue;

    // Event doesn't touch this day
    if (event.endTime < dayStart || event.startTime > dayEnd) continue;

    const isMultiDay = isMultiDayEvent(event);

    if (!isMultiDay) {
      // Single-day event on this day
      if (toDateKey(event.startTime) === toDateKey(day)) {
        result.push(event);
      }
    } else {
      // Multi-day timed event: clip to day boundaries
      const clippedStart = event.startTime < dayStart ? dayStart : event.startTime;
      const clippedEnd = event.endTime > dayEnd ? dayEnd : event.endTime;

      result.push({
        ...event,
        id: `${event.id}-${toDateKey(day)}`, // Unique ID per day segment
        originalId: event.id, // Keep reference to the real event
        startTime: clippedStart,
        endTime: clippedEnd,
      });
    }
  }

  return result;
}

export interface MultiDaySpan {
  event: CalendarEvent;
  startCol: number; // 0-based index into the visible days array
  span: number; // how many columns this event spans
}

/**
 * Compute multi-day event spans for a set of visible days.
 * Returns events with their column span info for rendering banners.
 */
export function computeMultiDaySpans(
  events: CalendarEvent[],
  visibleDays: Date[]
): MultiDaySpan[] {
  // Get all-day events and multi-day timed events
  const multiDayEvents = events.filter(
    (e) => e.isAllDay || isMultiDayEvent(e)
  );

  const dayKeys = visibleDays.map((d) => toDateKey(d));
  const spans: MultiDaySpan[] = [];

  for (const event of multiDayEvents) {
    const eventDays = getEventDateKeys(event);

    // Find first and last visible day for this event
    let firstCol = -1;
    let lastCol = -1;

    for (let i = 0; i < dayKeys.length; i++) {
      if (eventDays.includes(dayKeys[i])) {
        if (firstCol === -1) firstCol = i;
        lastCol = i;
      }
    }

    if (firstCol === -1) continue; // Event not in visible range

    spans.push({
      event,
      startCol: firstCol,
      span: lastCol - firstCol + 1,
    });
  }

  // Sort by start column, then by span (longest first) for stacking
  spans.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    return b.span - a.span;
  });

  return spans;
}
