/**
 * Client-side recurring event occurrence generation.
 * Uses rrule.js to expand recurring events efficiently in the browser.
 */

import { useMemo } from "react";
import { parseRRule, generateOccurrences } from "@/lib/utils/rrule";
import type { CalendarEvent } from "@/lib/types";

interface RawEvent extends Omit<CalendarEvent, "startTime" | "endTime"> {
  startTime: string | Date;
  endTime: string | Date;
  rrule?: string | null;
  exDates?: string[] | null;
}

/**
 * Hook to expand recurring events into individual occurrences within a date range.
 * This runs client-side for better performance and offline support.
 */
export function useRecurringEvents(
  rawEvents: RawEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  return useMemo(() => {
    const expandedEvents: CalendarEvent[] = [];

    for (const e of rawEvents) {
      // Normalize dates (API might return strings)
      const startTime = e.startTime instanceof Date ? e.startTime : new Date(e.startTime);
      const endTime = e.endTime instanceof Date ? e.endTime : new Date(e.endTime);

      if (e.isRecurring && e.rrule) {
        try {
          const rrule = parseRRule(e.rrule);
          const exDates = e.exDates ? e.exDates.map((d: string) => new Date(d)) : [];

          // Generate occurrences within the range
          const occurrences = generateOccurrences(
            rrule,
            startTime,
            rangeStart,
            rangeEnd,
            exDates
          );

          // Calculate event duration for each occurrence
          const duration = endTime.getTime() - startTime.getTime();

          // Create an event for each occurrence
          for (const occStart of occurrences) {
            const occEnd = new Date(occStart.getTime() + duration);
            expandedEvents.push({
              id: `${e.id}:${occStart.toISOString()}`, // Unique ID for this occurrence
              originalId: e.id, // Reference to the original recurring event
              title: e.title,
              description: e.description,
              startTime: occStart,
              endTime: occEnd,
              isAllDay: e.isAllDay,
              location: e.location,
              color: e.color,
              calendarId: e.calendarId,
              status: e.status,
              isRecurring: true,
            });
          }
        } catch (error) {
          console.error(`Failed to expand recurring event ${e.id}:`, error);
          // Fallback: show the original event
          expandedEvents.push({
            ...e,
            startTime,
            endTime,
          });
        }
      } else {
        // Non-recurring event
        expandedEvents.push({
          ...e,
          startTime,
          endTime,
        });
      }
    }

    return expandedEvents;
  }, [rawEvents, rangeStart, rangeEnd]);
}
