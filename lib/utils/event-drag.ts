/**
 * Utilities for event drag-and-drop between calendar views.
 */
import type { CalendarEvent } from "@/lib/types";

export const EVENT_DRAG_TYPE = "application/x-opencalendar-event";

export interface SerializedEvent {
  id: string;
  title: string;
  startTime: string; // ISO
  endTime: string; // ISO
  color: string;
  calendarId: string;
  isAllDay: boolean;
  location?: string;
  description?: string;
  rrule?: string | null;
  originalId?: string;
}

export function eventToDragData(event: CalendarEvent): string {
  const serialized: SerializedEvent = {
    id: event.id,
    title: event.title,
    startTime: new Date(event.startTime).toISOString(),
    endTime: new Date(event.endTime).toISOString(),
    color: event.color,
    calendarId: event.calendarId,
    isAllDay: event.isAllDay,
    location: event.location,
    description: event.description,
    rrule: event.rrule,
    originalId: event.originalId,
  };
  return JSON.stringify(serialized);
}

export function parseEventFromDragData(data: string): SerializedEvent | null {
  try {
    const parsed = JSON.parse(data) as SerializedEvent;
    if (parsed?.id && parsed?.startTime && parsed?.endTime) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}
