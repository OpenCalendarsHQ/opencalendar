import { useMemo } from "react";
import { parseRRule, generateOccurrences } from "../lib/utils/rrule";
import type { CalendarEvent } from "../lib/types";

interface RawEvent extends Omit<CalendarEvent, "startTime" | "endTime" | "isRecurring"> {
  startTime: string | Date;
  endTime: string | Date;
  isRecurring?: boolean | null;
  rrule?: string | null;
  exDates?: string[] | null;
}

export function useRecurringEvents(
  rawEvents: RawEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  return useMemo(() => {
    const expandedEvents: CalendarEvent[] = [];

    for (const e of rawEvents) {
      const startTime = e.startTime instanceof Date ? e.startTime : new Date(e.startTime);
      const endTime = e.endTime instanceof Date ? e.endTime : new Date(e.endTime);

      if (e.isRecurring && e.rrule) {
        try {
          const rrule = parseRRule(e.rrule);
          const exDates = e.exDates ? e.exDates.map((d: string) => new Date(d)) : [];

          const occurrences = generateOccurrences(
            rrule,
            startTime,
            rangeStart,
            rangeEnd,
            exDates
          );

          const duration = endTime.getTime() - startTime.getTime();

          for (const occStart of occurrences) {
            const occEnd = new Date(occStart.getTime() + duration);
            expandedEvents.push({
              ...e,
              id: `${e.id}:${occStart.toISOString()}`,
              originalId: e.id,
              startTime: occStart,
              endTime: occEnd,
            } as CalendarEvent);
          }
        } catch (error) {
          console.error(`Failed to expand recurring event ${e.id}:`, error);
          expandedEvents.push({
            ...e,
            startTime,
            endTime,
          } as CalendarEvent);
        }
      } else {
        expandedEvents.push({
          ...e,
          startTime,
          endTime,
        } as CalendarEvent);
      }
    }

    return expandedEvents;
  }, [rawEvents, rangeStart, rangeEnd]);
}
