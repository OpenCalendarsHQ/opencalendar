"use client";

import { useState, useCallback } from "react";
import type { CalendarEvent } from "@/components/calendar/event-card";

interface UseEventsOptions {
  initialEvents?: CalendarEvent[];
}

export function useEvents({ initialEvents = [] }: UseEventsOptions = {}) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (start: Date, end: Date) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          start: start.toISOString(),
          end: end.toISOString(),
        });

        const response = await fetch(`/api/events?${params}`);
        if (!response.ok) throw new Error("Events ophalen mislukt");

        const data = await response.json();

        // Convert date strings to Date objects
        const parsed: CalendarEvent[] = data.map(
          (e: Record<string, unknown>) => ({
            id: e.id as string,
            title: (e.title as string) || "(Geen titel)",
            startTime: new Date(e.startTime as string),
            endTime: new Date(e.endTime as string),
            color: (e.color as string) || "#3b82f6",
            calendarId: e.calendarId as string,
            isAllDay: e.isAllDay as boolean,
            location: e.location as string | undefined,
            description: e.description as string | undefined,
          })
        );

        setEvents(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Onbekende fout");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const createEvent = useCallback(
    async (event: Partial<CalendarEvent>) => {
      try {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId: event.calendarId,
            title: event.title,
            description: event.description,
            startTime: event.startTime?.toISOString(),
            endTime: event.endTime?.toISOString(),
            isAllDay: event.isAllDay,
            location: event.location,
            color: event.color,
          }),
        });

        if (!response.ok) throw new Error("Event aanmaken mislukt");

        const created = await response.json();
        const newEvent: CalendarEvent = {
          id: created.id,
          title: created.title,
          startTime: new Date(created.startTime),
          endTime: new Date(created.endTime),
          color: created.color || "#3b82f6",
          calendarId: created.calendarId,
          isAllDay: created.isAllDay,
          location: created.location,
          description: created.description,
        };

        setEvents((prev) => [...prev, newEvent]);
        return newEvent;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Onbekende fout");
        return null;
      }
    },
    []
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<CalendarEvent>) => {
      try {
        const response = await fetch("/api/events", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            ...updates,
            startTime: updates.startTime?.toISOString(),
            endTime: updates.endTime?.toISOString(),
          }),
        });

        if (!response.ok) throw new Error("Event bijwerken mislukt");

        const updated = await response.json();
        setEvents((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...updates,
                  startTime: new Date(updated.startTime),
                  endTime: new Date(updated.endTime),
                }
              : e
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Onbekende fout");
      }
    },
    []
  );

  const deleteEvent = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/events?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Event verwijderen mislukt");

      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    }
  }, []);

  return {
    events,
    setEvents,
    isLoading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
