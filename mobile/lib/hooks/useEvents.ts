import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../api/client';
import { RRule } from 'rrule';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  color: string;
  calendarId: string;
  status?: string;
  isRecurring: boolean;
  rrule?: string | null;
  exDates?: string[] | null;
}

export interface ExpandedEvent extends Event {
  isOccurrence?: boolean;
  originalEventId?: string;
  occurrenceDate?: Date;
}

export function useEvents(initialMonth: Date = new Date()) {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range (fetch 3 months at a time for better UX)
  const dateRange = useMemo(() => {
    const start = subMonths(startOfMonth(currentMonth), 1);
    const end = addMonths(endOfMonth(currentMonth), 1);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [currentMonth]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getEvents(dateRange);

      // Convert date strings to Date objects
      const parsedEvents = data.map((event: any) => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
      }));

      setEvents(parsedEvents);
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Expand recurring events into occurrences
  const expandedEvents = useMemo(() => {
    const expanded: ExpandedEvent[] = [];
    const rangeStart = new Date(dateRange.start);
    const rangeEnd = new Date(dateRange.end);

    for (const event of events) {
      if (event.isRecurring && event.rrule) {
        try {
          const rule = RRule.fromString(event.rrule);
          const occurrences = rule.between(rangeStart, rangeEnd, true);

          for (const occurrence of occurrences) {
            // Skip excluded dates
            if (event.exDates?.includes(occurrence.toISOString())) {
              continue;
            }

            // Calculate event duration
            const duration = event.endTime.getTime() - event.startTime.getTime();

            expanded.push({
              ...event,
              id: `${event.id}-${occurrence.toISOString()}`,
              startTime: occurrence,
              endTime: new Date(occurrence.getTime() + duration),
              isOccurrence: true,
              originalEventId: event.id,
              occurrenceDate: occurrence,
            });
          }
        } catch (error) {
          console.error('Failed to expand recurring event:', error);
          // Include the original event if expansion fails
          expanded.push(event);
        }
      } else {
        // Non-recurring event
        expanded.push(event);
      }
    }

    return expanded;
  }, [events, dateRange]);

  const createEvent = useCallback(async (eventData: {
    calendarId?: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    isAllDay?: boolean;
    location?: string;
    color?: string;
    rrule?: string;
    isRecurring?: boolean;
  }) => {
    try {
      await apiClient.createEvent({
        ...eventData,
        startTime: eventData.startTime.toISOString(),
        endTime: eventData.endTime.toISOString(),
      });
      await fetchEvents();
    } catch (err: any) {
      console.error('Failed to create event:', err);
      throw err;
    }
  }, [fetchEvents]);

  const updateEvent = useCallback(async (
    id: string,
    updates: Partial<Omit<Event, 'id' | 'startTime' | 'endTime'> & {
      startTime?: Date;
      endTime?: Date;
    }>
  ) => {
    try {
      const payload: any = { id, ...updates };

      if (updates.startTime) {
        payload.startTime = updates.startTime.toISOString();
      }
      if (updates.endTime) {
        payload.endTime = updates.endTime.toISOString();
      }

      await apiClient.updateEvent(payload);
      await fetchEvents();
    } catch (err: any) {
      console.error('Failed to update event:', err);
      throw err;
    }
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (id: string) => {
    try {
      await apiClient.deleteEvent(id);
      await fetchEvents();
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      throw err;
    }
  }, [fetchEvents]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events: expandedEvents,
    rawEvents: events,
    loading,
    error,
    currentMonth,
    setCurrentMonth,
    refetch: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
